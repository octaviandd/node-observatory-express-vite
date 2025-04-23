/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../../index";
import { getCallerInfo } from "../../utils";

// Create a global symbol to track if aws-ses has been patched
const AWS_SES_PATCHED_SYMBOL = Symbol.for("node-observer:aws-ses-patched");

if (
  process.env.NODE_OBSERVATORY_MAILER &&
  JSON.parse(process.env.NODE_OBSERVATORY_MAILER).includes(
    "@aws-sdk/client-ses",
  )
) {
  // Check if aws-ses has already been patched
  if (!(global as any)[AWS_SES_PATCHED_SYMBOL]) {
    // Mark aws-ses as patched
    (global as any)[AWS_SES_PATCHED_SYMBOL] = true;

    /**
     * Hook "@aws-sdk/client-ses" to patch its email sending functionality.
     */
    new Hook(["@aws-sdk/client-ses"], function (exports: any, name, basedir) {
      if (!exports || typeof exports.SESClient !== "function") {
        return exports;
      }

      // Get the original prototype
      const originalPrototype = exports.SESClient.prototype;

      // Patch only the send method on the prototype
      if (originalPrototype && typeof originalPrototype.send === "function") {
        shimmer.wrap(originalPrototype, "send", function (originalSend) {
          return async function patchedSend(
            this: any,
            command: any,
            ...sendArgs: any[]
          ) {
            const startTime = performance.now();
            const callerInfo = getCallerInfo(__filename);

            const commandName = command.constructor.name;
            const input = command.input || {};

            const content = {
              command: commandName,
              to: input.Destination?.ToAddresses || [],
              cc: input.Destination?.CcAddresses || [],
              bcc: input.Destination?.BccAddresses || [],
              from: input.Source,
              subject: input.Message?.Subject?.Data,
              body:
                input.Message?.Body?.Html?.Data ||
                input.Message?.Body?.Text?.Data,
              file: callerInfo.file,
              line: callerInfo.line,
              package: "aws-sdk/client-ses",
            };

            try {
              const result = await originalSend.call(
                this,
                command,
                ...sendArgs,
              );
              const endTime = performance.now();
              const duration = parseFloat((endTime - startTime).toFixed(2));

              watchers.mailer.addContent({
                status: "completed",
                info: {
                  messageId: result.MessageId,
                  response: result.$metadata,
                },
                duration,
                ...content,
              });

              return result;
            } catch (err: any) {
              const endTime = performance.now();
              const duration = parseFloat((endTime - startTime).toFixed(2));

              watchers.mailer.addContent({
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

      return exports;
    });

    /**
     * Hook "@aws-sdk" to patch SES functionality when imported directly from the main AWS SDK.
     */
    new Hook(["@aws-sdk"], function (exports: any, name, basedir) {
      // Handle case where user imports from @aws-sdk directly
      if (!exports) {
        return exports;
      }

      // Intercept the SES client when it's loaded from the main SDK
      // We need to use a getter to intercept when the property is accessed
      Object.defineProperty(exports, "SES", {
        configurable: true,
        enumerable: true,
        get: function () {
          const originalSES = exports.SES;

          // If SES exists and has a Client property with a prototype
          if (
            originalSES &&
            originalSES.Client &&
            originalSES.Client.prototype
          ) {
            const originalPrototype = originalSES.Client.prototype;

            // Patch the send method if it exists
            if (typeof originalPrototype.send === "function") {
              shimmer.wrap(originalPrototype, "send", function (originalSend) {
                return async function patchedSend(
                  this: any,
                  command: any,
                  ...sendArgs: any[]
                ) {
                  const startTime = performance.now();
                  const callerInfo = getCallerInfo(__filename);

                  const commandName = command.constructor.name;
                  const input = command.input || {};

                  const content = {
                    command: commandName,
                    to: input.Destination?.ToAddresses || [],
                    cc: input.Destination?.CcAddresses || [],
                    bcc: input.Destination?.BccAddresses || [],
                    from: input.Source,
                    subject: input.Message?.Subject?.Data,
                    body:
                      input.Message?.Body?.Html?.Data ||
                      input.Message?.Body?.Text?.Data,
                    file: callerInfo.file,
                    line: callerInfo.line,
                    package: "aws-sdk",
                  };

                  try {
                    const result = await originalSend.call(
                      this,
                      command,
                      ...sendArgs,
                    );
                    const endTime = performance.now();
                    const duration = parseFloat(
                      (endTime - startTime).toFixed(2),
                    );

                    watchers.mailer.addContent({
                      status: "completed",
                      info: {
                        messageId: result.MessageId,
                        response: result.$metadata,
                      },
                      duration,
                      ...content,
                    });

                    return result;
                  } catch (err: any) {
                    const endTime = performance.now();
                    const duration = parseFloat(
                      (endTime - startTime).toFixed(2),
                    );

                    watchers.mailer.addContent({
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
          }

          return originalSES;
        },
      });

      return exports;
    });
  }
}
