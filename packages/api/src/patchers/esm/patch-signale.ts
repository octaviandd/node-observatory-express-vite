/** @format */

import { addHook, Namespace } from "import-in-the-middle";
import shimmer from "shimmer";
import { watchers, patchedGlobal } from "../../core/index.js";
import { getCallerInfo } from "../../core/helpers/helpers.js";

const SIGNALE_PATCHED_SYMBOL = Symbol.for("node-observer:signale-patched");

if (
  process.env.NODE_OBSERVATORY_LOGGING &&
  JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("signale")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SIGNALE_PATCHED_SYMBOL]) {
    patchedGlobal[SIGNALE_PATCHED_SYMBOL] = true;

    addHook((exports: any, name: Namespace, baseDir?: string) => {
      // Only patch 'signale' module
      // if (name !== 'signale') {
      //   return exports;
      // }

      // Handle both default and named exports
      const signaleModule = exports.default || exports;

      if (!signaleModule || typeof signaleModule !== "object") {
        return exports;
      }

      const OriginalSignale = signaleModule.Signale;

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
