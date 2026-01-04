/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers, patchedGlobal } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";

if (
  process.env.NODE_OBSERVATORY_LOGGING &&
  JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("signale")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SIGNALE_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SIGNALE_PATCHED_SYMBOL] = true;

    new Hook(["signale"], function (exports: any, name, basedir) {
      if (!exports || typeof exports !== "object") {
        return exports;
      }

      const OriginalSignale = exports.Signale;

      shimmer.wrap(
        OriginalSignale.prototype,
        "_logger",
        function wrapLogger(originalLogger) {
          return function patchedLogger(this: any, type: any, ...args: any[]) {
            const callerInfo = getCallerInfo(__filename);

            const logContent = {
              package: "signale",
              level: type,
              message: args[0],
              file: callerInfo.file,
              line: callerInfo.line,
              created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
            };

            watchers.logging.insertRedisStream(logContent);
            return originalLogger.call(this, type, ...args);
          };
        },
      );

      return exports;
    });
  }
}
