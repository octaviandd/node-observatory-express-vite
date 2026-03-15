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
  client: any,
  method: string,
  command: "SendMail" | "SendTemplateEmail",
  isTemplate: boolean,
  filename: string,
) {
  if (typeof client[method] !== "function") return;

  shimmer.wrap(
    client,
    method,
    (original) =>
      async function patched(this: any, data: any) {
        const startTime = performance.now();
        const callerInfo = getCallerInfo(filename);

        const mailData: MailData = {
          command,
          to: toArray(data.To),
          cc: toArray(data.Cc),
          bcc: toArray(data.Bcc),
          from: data.From,
          subject: isTemplate ? undefined : data.Subject,
          body: isTemplate ? undefined : data.HtmlBody || data.TextBody,
          templateId: isTemplate ? data.TemplateId : undefined,
        };

        try {
          const result = await original.call(this, data);

          log({
            metadata: {
              package: "postmark",
              duration: parseFloat((performance.now() - startTime).toFixed(2)),
              location: { file: callerInfo.file, line: callerInfo.line },
              created_at: timestamp(),
            },
            data: mailData,
          });

          return result;
        } catch (err: any) {
          log({
            metadata: {
              package: "postmark",
              duration: parseFloat((performance.now() - startTime).toFixed(2)),
              location: { file: callerInfo.file, line: callerInfo.line },
              created_at: timestamp(),
            },
            data: mailData,
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

export function patchPostmarkExports(exports: any, filename: string): any {
  if (typeof exports?.ServerClient !== "function") return exports;

  shimmer.wrap(
    exports,
    "ServerClient",
    (OriginalServerClient) =>
      function PatchedServerClient(this: any, ...args: any[]) {
        const client = new OriginalServerClient(...args);
        patchSendMethod(client, "sendEmail", "SendMail", false, filename);
        patchSendMethod(
          client,
          "sendEmailWithTemplate",
          "SendTemplateEmail",
          true,
          filename,
        );
        return client;
      },
  );

  return exports;
}
