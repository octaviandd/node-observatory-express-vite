/** @format */

import { addHook, Namespace } from "import-in-the-middle";
import shimmer from "shimmer";
import { watchers, patchedGlobal } from "../../core/index.js";
import { getCallerInfo } from "../../core/helpers/helpers.js";

// Create a global symbol to track if log4js has been patched
const LOG4JS_PATCHED_SYMBOL = Symbol.for("node-observer:log4js-patched");

if (
  process.env.NODE_OBSERVATORY_LOGGING &&
  JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("log4js")
) {
  // Check if log4js has already been patched
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LOG4JS_PATCHED_SYMBOL]) {
    // Mark log4js as patched
    patchedGlobal[LOG4JS_PATCHED_SYMBOL] = true;

    // Intercepts `import log4js from "log4js"`
    addHook((exports: any, name: Namespace, baseDir?: string) => {
      // Only patch 'log4js' module
      // if (name !== 'log4js') {
      //   return exports;
      // }

      // Handle both default and named exports
      const log4jsModule = exports.default || exports;

      // `log4jsModule` is the log4js module.
      // We'll patch `getLogger` so that we can intercept the returned logger instance.

      // Wrap the getLogger function
      shimmer.wrap(
        log4jsModule,
        "getLogger",
        function (originalFn: Function) {
          return function patchedGetLogger(this: any, ...loggerArgs: any[]) {
            // Call the original getLogger
            const loggerInstance = originalFn.apply(this, loggerArgs);

            // Patch each logging method
            [
              "info",
              "warn",
              "error",
              "debug",
              "trace",
              "fatal",
              "mark",
            ].forEach((method) => {
              if (typeof loggerInstance[method] === "function") {
                shimmer.wrap(loggerInstance, method, function (originalMethod) {
                  return function patchedMethod(this: any, ...args: any[]) {
                    const callerInfo = getCallerInfo(__filename);

                    watchers.logging.insertRedisStream({
                      package: "log4js",
                      level: method,
                      message: args[0],
                      file: callerInfo.file,
                      line: callerInfo.line,
                    });
                    // Then call the original method
                    return originalMethod.apply(this, args);
                  };
                });
              }
            });
            return loggerInstance;
          };
        },
      );
      return exports;
    });
  }
}
