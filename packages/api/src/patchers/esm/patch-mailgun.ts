/** @format */

import { addHook, Namespace } from "import-in-the-middle";
import shimmer from "shimmer";
import { watchers, patchedGlobal } from "../../core/index.js";
import { getCallerInfo } from "../../core/helpers/helpers.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";

if (
  process.env.NODE_OBSERVATORY_MAILER &&
  JSON.parse(process.env.NODE_OBSERVATORY_MAILER).includes("mailgun.js")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MAILGUN_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MAILGUN_PATCHED_SYMBOL] = true;

    addHook((exports: any, name: Namespace, baseDir?: string) => {
      if (!exports || typeof exports.default !== "function") {
        return exports;
      }

      shimmer.wrap(exports, "default", function (OriginalMailgun) {
        return function PatchedMailgun(this: any, ...args: any[]) {
          const mailgun = new OriginalMailgun(...args);

          if (
            mailgun &&
            mailgun.messages &&
            typeof mailgun.messages().create === "function"
          ) {
            const messages = mailgun.messages();
            shimmer.wrap(messages, "create", function (originalCreate) {
              return async function patchedCreate(
                this: any,
                domain: string,
                data: any,
              ) {
                const startTime = performance.now();

                const callerInfo = getCallerInfo(__filename);

                const content = {
                  command: "SendMail",
                  to: Array.isArray(data.to) ? data.to : [data.to],
                  cc: Array.isArray(data.cc)
                    ? data.cc
                    : data.cc
                      ? [data.cc]
                      : [],
                  bcc: Array.isArray(data.bcc)
                    ? data.bcc
                    : data.bcc
                      ? [data.bcc]
                      : [],
                  from: data.from,
                  subject: data.subject,
                  body: data.html || data.text,
                  file: callerInfo.file,
                  line: callerInfo.line,
                  package: "mailgun.js",
                };

                try {
                  const result = await originalCreate.call(this, domain, data);
                  const endTime = performance.now();
                  const duration = parseFloat((endTime - startTime).toFixed(2));

                  watchers.mailer.insertRedisStream({
                    status: "completed",
                    info: {
                      messageId: result.id,
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

          return mailgun;
        };
      });
      return exports;
    });
  }
}
