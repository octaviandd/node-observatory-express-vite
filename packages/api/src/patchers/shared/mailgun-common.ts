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

export function patchMailgunExports(exports: any, filename: string): any {
  if (!exports || typeof exports.default !== "function") return exports;

  shimmer.wrap(
    exports,
    "default",
    (OriginalMailgun) =>
      function PatchedMailgun(this: any, ...args: any[]) {
        const mailgun = new OriginalMailgun(...args);

        if (
          mailgun?.messages &&
          typeof mailgun.messages().create === "function"
        ) {
          const messages = mailgun.messages();

          shimmer.wrap(
            messages,
            "create",
            (originalCreate) =>
              async function patchedCreate(
                this: any,
                domain: string,
                data: any,
              ) {
                const startTime = performance.now();
                const callerInfo = getCallerInfo(filename);

                const mailData: MailData = {
                  command: "SendMail",
                  to: toArray(data.to),
                  cc: toArray(data.cc),
                  bcc: toArray(data.bcc),
                  from: data.from,
                  subject: data.subject,
                  body: data.html || data.text,
                };

                try {
                  const result = await originalCreate.call(this, domain, data);

                  log({
                    metadata: {
                      package: "mailgun.js",
                      duration: parseFloat(
                        (performance.now() - startTime).toFixed(2),
                      ),
                      location: {
                        file: callerInfo.file,
                        line: callerInfo.line,
                      },
                      created_at: timestamp(),
                    },
                    data: mailData,
                  });

                  return result;
                } catch (err: any) {
                  log({
                    metadata: {
                      package: "mailgun.js",
                      duration: parseFloat(
                        (performance.now() - startTime).toFixed(2),
                      ),
                      location: {
                        file: callerInfo.file,
                        line: callerInfo.line,
                      },
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

        return mailgun;
      },
  );

  return exports;
}
