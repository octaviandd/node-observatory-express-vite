/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type SendgridMetadata = { package: "@sendgrid/mail"; command: "SendMail" | "SendMultiple" };
type SendgridData = { to: string[]; cc: string[]; bcc: string[]; from: string; subject: string; body: string; messageId?: string };

export type SendgridLogEntry = BaseLogEntry<SendgridMetadata, SendgridData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: SendgridLogEntry) { 
    watchers.mailer.insertRedisStream({ ...entry, created_at: timestamp() })
}

const toArray = (val: any) => (Array.isArray(val) ? val : val ? [val] : []);

function patchSendMethod(exports: any, method: "send" | "sendMultiple", command: "SendMail" | "SendMultiple", filename: string) {
  if (typeof exports[method] !== "function") return;

  shimmer.wrap(exports, method, (original) =>
    async function patched(this: any, mailData: any) {
      const startTime = performance.now();
      const callerInfo = getCallerInfo(filename);
      const base = {
        metadata: { package: "@sendgrid/mail" as const, command },
        data: {
          to: toArray(mailData.to),
          cc: toArray(mailData.cc),
          bcc: toArray(mailData.bcc),
          from: mailData.from,
          subject: mailData.subject,
          body: mailData.html || mailData.text,
        },
      };

      try {
        const result = await original.call(this, mailData);
        const duration = parseFloat((performance.now() - startTime).toFixed(2));
        const messageId = Array.isArray(result) ? result[0]?.headers?.["x-message-id"] : result?.headers?.["x-message-id"];
        log({ status: "completed", duration, location: { file: callerInfo.file, line: callerInfo.line }, ...base });
        return result;
      } catch (err: any) {
        const duration = parseFloat((performance.now() - startTime).toFixed(2));
        log({ status: "failed", duration, error: { name: err.name, message: err.message, stack: err.stack }, ...base });
        throw err;
      }
    }
  );
}

export function patchSendgridExports(exports: any, filename: string): any {
  patchSendMethod(exports, "send", "SendMail", filename);
  patchSendMethod(exports, "sendMultiple", "SendMultiple", filename);
  return exports;
}

