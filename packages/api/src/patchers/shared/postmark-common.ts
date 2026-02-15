/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type PostmarkMetadata = { package: "postmark"; command: "SendMail" | "SendTemplateEmail" };
type PostmarkData = { to: string[]; cc: string[]; bcc: string[]; from: string; subject?: string; body?: string; templateId?: string; messageId?: string };

export type PostmarkLogEntry = BaseLogEntry<PostmarkMetadata, PostmarkData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);
const toArray = (val: any) => (Array.isArray(val) ? val : val ? [val] : []);

function log(entry: PostmarkLogEntry) { 
    watchers.mailer.insertRedisStream({ ...entry, created_at: timestamp() })
}

function patchSendMethod(client: any, method: string, command: "SendMail" | "SendTemplateEmail", isTemplate: boolean, filename: string) {
  if (typeof client[method] !== "function") return;

  shimmer.wrap(client, method, (original) =>
    async function patched(this: any, data: any) {
      const startTime = performance.now();
      const callerInfo = getCallerInfo(filename);

      const base = {
        metadata: { package: "postmark" as const, command },
        data: {
          to: toArray(data.To),
          cc: toArray(data.Cc),
          bcc: toArray(data.Bcc),
          from: data.From,
          subject: isTemplate ? undefined : data.Subject,
          body: isTemplate ? undefined : (data.HtmlBody || data.TextBody),
          templateId: isTemplate ? data.TemplateId : undefined,
        },
      };

      try {
        const result = await original.call(this, data);
        log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, ...base });
        return result;
      } catch (err: any) {
        log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), error: { name: err.name, message: err.message, stack: err.stack }, ...base });
        throw err;
      }
    }
  );
}

export function patchPostmarkExports(exports: any, filename: string): any {
  if (typeof exports?.ServerClient !== "function") return exports;

  shimmer.wrap(exports, "ServerClient", (OriginalServerClient) =>
    function PatchedServerClient(this: any, ...args: any[]) {
      const client = new OriginalServerClient(...args);
      patchSendMethod(client, "sendEmail", "SendMail", false, filename);
      patchSendMethod(client, "sendEmailWithTemplate", "SendTemplateEmail", true, filename);
      return client;
    }
  );

  return exports;
}

