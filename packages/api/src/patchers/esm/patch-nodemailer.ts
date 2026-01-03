/** @format */

import { addHook, Namespace } from "import-in-the-middle";
import shimmer from "shimmer";
import { watchers, patchedGlobal } from "../../core/index.js";
import { getCallerInfo } from "../../core/helpers/helpers.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";

if (
  process.env.NODE_OBSERVATORY_MAILER &&
  JSON.parse(process.env.NODE_OBSERVATORY_MAILER).includes("nodemailer")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODEMAILER_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODEMAILER_PATCHED_SYMBOL] = true;

    addHook((exports: any, name: Namespace, baseDir?: string) => {
      const nodemailerModule = exports.default || exports;

      shimmer.wrap(nodemailerModule, "createTransport", function (originalFn) {
        return function patchedCreateTransport(this: any, ...args: any[]) {
          const transporter = originalFn.apply(this, args);
          if (transporter && typeof transporter.sendMail === "function") {
            shimmer.wrap(transporter, "sendMail", function (originalSendMail) {
              return function patchedSendMail(
                this: any,
                mailOptions: any,
                callback: (err: Error | null, info?: any) => void,
              ) {
                const startTime = performance.now();
                const callerInfo = getCallerInfo(__filename);

                const content = {
                  command: "SendMail",
                  to: Array.isArray(mailOptions.to)
                    ? mailOptions.to
                    : [mailOptions.to],
                  cc: Array.isArray(mailOptions.cc)
                    ? mailOptions.cc
                    : mailOptions.cc
                      ? [mailOptions.cc]
                      : [],
                  bcc: Array.isArray(mailOptions.bcc)
                    ? mailOptions.bcc
                    : mailOptions.bcc
                      ? [mailOptions.bcc]
                      : [],
                  from: mailOptions.from,
                  subject: mailOptions.subject,
                  body: mailOptions.html || mailOptions.text,
                  file: callerInfo.file,
                  line: callerInfo.line,
                  package: "nodemailer",
                };

                const result = originalSendMail.call(
                  this,
                  mailOptions,
                  callback,
                );

                if (result && typeof result.then === "function") {
                  result
                    .then((info: any) => {
                      const endTime = performance.now();
                      const duration = parseFloat(
                        (endTime - startTime).toFixed(2),
                      );

                      watchers.mailer.insertRedisStream({
                        status: "completed",
                        info: {
                          messageId: info.messageId,
                          response: info.response,
                        },
                        duration,
                        ...content,
                      });
                    })
                    .catch((err: Error) => {
                      const endTime = performance.now();
                      const duration = parseFloat(
                        (endTime - startTime).toFixed(2),
                      );

                      watchers.mailer.insertRedisStream({
                        status: "failed",
                        error: {
                          name: err.name,
                          message: err.message,
                        },
                        duration,
                        ...content,
                      });
                    });
                }

                return result;
              };
            });
          }

          return transporter;
        };
      });

      return exports;
    });
  }
}
