/** @format */

import { addHook, Namespace } from "import-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../../../index.js";
import { getCallerInfo } from "../../../utils.js";

const SENDGRID_PATCHED_SYMBOL = Symbol.for("node-observer:sendgrid-patched");

if (
  process.env.NODE_OBSERVATORY_MAILER &&
  JSON.parse(process.env.NODE_OBSERVATORY_MAILER).includes("@sendgrid/mail")
) {
  if (!(global as any)[SENDGRID_PATCHED_SYMBOL]) {
    (global as any)[SENDGRID_PATCHED_SYMBOL] = true;

    addHook((exports: any, name: Namespace, baseDir?: string) => {
      // Only patch '@sendgrid/mail' module
      // if (name !== '@sendgrid/mail') {
      //   return exports;
      // }

      // Handle both default and named exports
      const sendgridModule = exports.default || exports;

      if (typeof sendgridModule.send === "function") {
        shimmer.wrap(sendgridModule, "send", function (originalSend) {
          return async function patchedSend(this: any, mailData: any) {
            const startTime = performance.now();
            const callerInfo = getCallerInfo(__filename);

            const content = {
              command: "SendMail",
              to: Array.isArray(mailData.to) ? mailData.to : [mailData.to],
              cc: Array.isArray(mailData.cc)
                ? mailData.cc
                : mailData.cc
                  ? [mailData.cc]
                  : [],
              bcc: Array.isArray(mailData.bcc)
                ? mailData.bcc
                : mailData.bcc
                  ? [mailData.bcc]
                  : [],
              from: mailData.from,
              subject: mailData.subject,
              body: mailData.html || mailData.text,
              file: callerInfo.file,
              line: callerInfo.line,
              package: "@sendgrid/mail",
            };

            try {
              const result = await originalSend.call(this, mailData);
              const endTime = performance.now();
              const duration = parseFloat((endTime - startTime).toFixed(2));

              watchers.mailer.insertRedisStream({
                status: "completed",
                info: {
                  messageId: Array.isArray(result)
                    ? result[0].headers["x-message-id"]
                    : result.headers["x-message-id"],
                  response: result,
                },
                duration,
                ...content,
              });

              return result;
            } catch (err: any) {
              const endTime = performance.now();
              const duration = parseFloat((endTime - startTime).toFixed(2));

              watchers.mailer.insertRedisStream({
                status: "failed",
                error: {
                  name: err.name,
                  message: err.message,
                  stack: err.stack,
                },
                duration,
                ...content,
              });
              throw err;
            }
          };
        });
      }

      // 2. Patch the `sendMultiple` function (shortcut for multiple emails)
      if (typeof sendgridModule.sendMultiple === "function") {
        shimmer.wrap(
          sendgridModule,
          "sendMultiple",
          function (originalSendMultiple) {
            return async function patchedSendMultiple(
              this: any,
              mailData: any,
            ) {
              const startTime = performance.now();
              const callerInfo = getCallerInfo(__filename);

              const content = {
                command: "SendMultiple",
                to: Array.isArray(mailData.to) ? mailData.to : [mailData.to],
                cc: Array.isArray(mailData.cc)
                  ? mailData.cc
                  : mailData.cc
                    ? [mailData.cc]
                    : [],
                bcc: Array.isArray(mailData.bcc)
                  ? mailData.bcc
                  : mailData.bcc
                    ? [mailData.bcc]
                    : [],
                from: mailData.from,
                subject: mailData.subject,
                body: mailData.html || mailData.text,
                file: callerInfo.file,
                line: callerInfo.line,
                package: "@sendgrid/mail",
              };

              try {
                const result = await originalSendMultiple.call(this, mailData);
                const endTime = performance.now();
                const duration = parseFloat((endTime - startTime).toFixed(2));

                watchers.mailer.insertRedisStream({
                  status: "completed",
                  info: {
                    messageId: result[0].headers["x-message-id"],
                    response: result,
                  },
                  duration,
                  ...content,
                  file: callerInfo.file,
                  line: callerInfo.line,
                });

                return result;
              } catch (err: any) {
                const endTime = performance.now();
                const duration = parseFloat((endTime - startTime).toFixed(2));

                watchers.mailer.insertRedisStream({
                  status: "failed",
                  error: {
                    name: err.name,
                    message: err.message,
                    stack: err.stack,
                  },
                  duration,
                  ...content,
                  file: callerInfo.file,
                  line: callerInfo.line,
                });
                throw err;
              }
            };
          },
        );
      }

      return exports;
    });
  }
}
