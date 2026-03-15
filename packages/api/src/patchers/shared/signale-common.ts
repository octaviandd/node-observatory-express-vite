/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: LogContent) {
  watchers.logging.insertRedisStream({ ...entry });
}

export function patchSignaleExports(exports: any, filename: string): any {
  if (!exports || typeof exports !== "object" || !exports.Signale)
    return exports;

  shimmer.wrap(
    exports.Signale.prototype,
    "_logger",
    (originalLogger) =>
      function patchedLogger(this: any, type: any, ...args: any[]) {
        const callerInfo = getCallerInfo(filename);

        log({
          metadata: {
            package: "signale",
            level: type,
            location: { file: callerInfo.file, line: callerInfo.line },
            created_at: timestamp(),
          },
          data: { message: args[0] },
        });

        return originalLogger.call(this, type, ...args);
      },
  );

  return exports;
}
