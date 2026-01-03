/** @format */

import { addHook, Namespace } from "import-in-the-middle";
import shimmer from "shimmer";
import { watchers, patchedGlobal } from "../../core/index.js";
import { getCallerInfo } from "../../core/helpers/helpers.js";

// Create a global symbol to track if winston has been patched
const WINSTON_PATCHED_SYMBOL = Symbol.for("node-observer:winston-patched");
if (
  process.env.NODE_OBSERVATORY_LOGGING &&
  JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("winston")
) {
  // Check if winston has already been patched
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.WINSTON_PATCHED_SYMBOL]) {
    // Mark winston as patched
    patchedGlobal[WINSTON_PATCHED_SYMBOL] = true;

    addHook((exports: any, name: Namespace, baseDir?: string) => {
      // Only patch 'winston' module
      // if (name !== 'winston') {
      //   return exports;
      // }

      // Handle both default and named exports
      const winstonModule = exports.default || exports;

      shimmer.wrap(winstonModule, "createLogger", function (originalCreateLogger) {
        return function patchedCreateLogger(this: any, ...loggerArgs: any[]) {
          const loggerInstance = originalCreateLogger.apply(this, loggerArgs);

          // 3. Patch logger methods like `info`, `warn`, `error`
          ["info", "warn", "error", "debug", "verbose", "silly", "log"].forEach(
            (method) => {
              if (typeof loggerInstance[method] === "function") {
                shimmer.wrap(loggerInstance, method, function (originalMethod) {
                  return function patchedMethod(this: any, ...args: any) {
                    const callerInfo = getCallerInfo(__filename);

                    watchers.logging.insertRedisStream({
                      level: method,
                      package: "winston",
                      message: args[0],
                      meta: args[1] || {},
                      file: callerInfo.file,
                      line: callerInfo.line,
                    });

                    // Continue calling the original Winston method
                    return originalMethod.apply(this, args);
                  };
                });
              }
            },
          );

          return loggerInstance;
        };
      });

      //
      // 4. Patch the default logger (e.g., `winston.info(...)`) if needed
      //
      if (winstonModule.default && typeof winstonModule.default === "object") {
        // Winston exports a default logger with methods like info, warn, error, etc.
        ["info", "warn", "error", "debug", "verbose", "silly", "log"].forEach(
          (method) => {
            if (typeof winstonModule.default[method] === "function") {
              shimmer.wrap(winstonModule.default, method, function (originalMethod) {
                return function patchedMethod(this: any, ...args: any) {
                  const callerInfo = getCallerInfo(__filename);

                  watchers.logging.insertRedisStream({
                    level: method,
                    package: "winston",
                    message: args[0],
                    meta: args[1] || {},
                    file: callerInfo.file,
                    line: callerInfo.line,
                  });

                  return originalMethod.apply(this, args);
                };
              });
            }
          },
        );
      }

      return exports;
    });
  }
}
