/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

const toArray = (val: any) => (Array.isArray(val) ? val : val ? [val] : []);

function log(entry: MailContent) {
  watchers.mailer.insertRedisStream({ ...entry });
}

function patchSendMethod(
  exports: any,
  method: "send" | "sendMultiple",
  command: "SendMail" | "SendMultiple",
  filename: string,
) {
  if (typeof exports[method] !== "function") return;

  shimmer.wrap(
    exports,
    method,
    (original) =>
      async function patched(this: any, mailData: any) {
        const startTime = performance.now();
        const callerInfo = getCallerInfo(filename);

        const data: MailData = {
          command,
          to: toArray(mailData.to),
          cc: toArray(mailData.cc),
          bcc: toArray(mailData.bcc),
          from: mailData.from,
          subject: mailData.subject,
          body: mailData.html || mailData.text,
        };

        try {
          const result = await original.call(this, mailData);
          const messageId = Array.isArray(result)
            ? result[0]?.headers?.["x-message-id"]
            : result?.headers?.["x-message-id"];

          log({
            metadata: {
              package: "@sendgrid/mail",
              duration: parseFloat((performance.now() - startTime).toFixed(2)),
              location: { file: callerInfo.file, line: callerInfo.line },
              created_at: timestamp(),
            },
            data: { ...data, messageId },
          });

          return result;
        } catch (err: any) {
          log({
            metadata: {
              package: "@sendgrid/mail",
              duration: parseFloat((performance.now() - startTime).toFixed(2)),
              location: { file: callerInfo.file, line: callerInfo.line },
              created_at: timestamp(),
            },
            data,
            error: {
              name: err.name,
              message: err.message,
              stack: err.stack,
            },
          });

          throw err;
        }
      },
  );
}

export function patchSendgridExports(exports: any, filename: string): any {
  patchSendMethod(exports, "send", "SendMail", filename);
  patchSendMethod(exports, "sendMultiple", "SendMultiple", filename);
  return exports;
}
