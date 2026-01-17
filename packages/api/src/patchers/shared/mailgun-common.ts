/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type MailgunMetadata = { package: "mailgun.js"; command: "SendMail" };
type MailgunData = { to: string[]; cc: string[]; bcc: string[]; from: string; subject: string; body: string; messageId?: string };

export type MailgunLogEntry = BaseLogEntry<MailgunMetadata, MailgunData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);
const toArray = (val: any) => (Array.isArray(val) ? val : val ? [val] : []);

function log(entry: MailgunLogEntry) { 
    watchers.mailer.insertRedisStream({ ...entry, created_at: timestamp() })
}

export function patchMailgunExports(exports: any, filename: string): any {
  if (!exports || typeof exports.default !== "function") return exports;

  shimmer.wrap(exports, "default", (OriginalMailgun) =>
    function PatchedMailgun(this: any, ...args: any[]) {
      const mailgun = new OriginalMailgun(...args);

      if (mailgun?.messages && typeof mailgun.messages().create === "function") {
        const messages = mailgun.messages();
        shimmer.wrap(messages, "create", (originalCreate) =>
          async function patchedCreate(this: any, domain: string, data: any) {
            const startTime = performance.now();
            const callerInfo = getCallerInfo(filename);

            const base = {
              metadata: { package: "mailgun.js" as const, command: "SendMail" as const },
              data: {
                to: toArray(data.to),
                cc: toArray(data.cc),
                bcc: toArray(data.bcc),
                from: data.from,
                subject: data.subject,
                body: data.html || data.text,
              },
            };

            try {
              const result = await originalCreate.call(this, domain, data);
              log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, ...base });
              return result;
            } catch (err: any) {
              log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), error: { name: err.name, message: err.message, stack: err.stack }, ...base });
              throw err;
            }
          }
        );
      }

      return mailgun;
    }
  );

  return exports;
}

