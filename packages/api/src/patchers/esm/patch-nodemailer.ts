/** @format */

import { addHook, Namespace } from "import-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../../../index.js";
import { getCallerInfo } from "../../../utils.js";

const NODEMAILER_PATCHED_SYMBOL = Symbol.for(
  "node-observer:nodemailer-patched",
);

if (
  process.env.NODE_OBSERVATORY_MAILER &&
  JSON.parse(process.env.NODE_OBSERVATORY_MAILER).includes("nodemailer")
) {
  if (!(global as any)[NODEMAILER_PATCHED_SYMBOL]) {
    (global as any)[NODEMAILER_PATCHED_SYMBOL] = true;

    addHook((exports: any, name: Namespace, baseDir?: string) => {
      // Only patch 'nodemailer' module
      // if (name !== 'nodemailer') {
      //   return exports;
      // }

      // Handle both default and named exports
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

                      watchers.mailer.addContent({
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

                      watchers.mailer.addContent({
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
