/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: MailContent) {
  watchers.mailer.insertRedisStream({ ...entry });
}

function createPatchedSend(
  pkg: "@aws-sdk/client-ses" | "aws-sdk",
  filename: string,
) {
  return (originalSend: Function) =>
    async function patchedSend(this: any, command: any, ...sendArgs: any[]) {
      const startTime = performance.now();
      const callerInfo = getCallerInfo(filename);
      const commandName = command.constructor.name;
      const input = command.input || {};

      const data: MailData = {
        command: commandName,
        to: input.Destination?.ToAddresses || [],
        cc: input.Destination?.CcAddresses || [],
        bcc: input.Destination?.BccAddresses || [],
        from: input.Source,
        subject: input.Message?.Subject?.Data,
        body:
          input.Message?.Body?.Html?.Data || input.Message?.Body?.Text?.Data,
      };

      try {
        const result = await originalSend.call(this, command, ...sendArgs);

        log({
          metadata: {
            package: pkg,
            duration: parseFloat((performance.now() - startTime).toFixed(2)),
            location: { file: callerInfo.file, line: callerInfo.line },
            created_at: timestamp(),
          },
          data,
        });

        return result;
      } catch (err: any) {
        log({
          metadata: {
            package: pkg,
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
    };
}

export function patchAwsSesExports(exports: any, filename: string): any {
  if (exports?.SESClient?.prototype?.send) {
    shimmer.wrap(
      exports.SESClient.prototype,
      "send",
      createPatchedSend("@aws-sdk/client-ses", filename),
    );
  }

  return exports;
}

export function patchAwsSdkExports(exports: any, filename: string): any {
  if (!exports) return exports;

  // Handle lazy property access for @aws-sdk
  Object.defineProperty(exports, "SES", {
    configurable: true,
    enumerable: true,
    get: function () {
      const originalSES = exports.SES;
      if (originalSES?.Client?.prototype?.send) {
        shimmer.wrap(
          originalSES.Client.prototype,
          "send",
          createPatchedSend("aws-sdk", filename),
        );
      }
      return originalSES;
    },
  });

  return exports;
}
