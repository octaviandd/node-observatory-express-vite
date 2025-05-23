/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../../index";
import { getCallerInfo } from "../../utils";

// Create a global symbol to track if winston has been patched
const WINSTON_PATCHED_SYMBOL = Symbol.for("node-observer:winston-patched");
if (
  process.env.NODE_OBSERVATORY_LOGGING &&
  JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("winston")
) {
  // Check if winston has already been patched
  if (!(global as any)[WINSTON_PATCHED_SYMBOL]) {
    // Mark winston as patched
    (global as any)[WINSTON_PATCHED_SYMBOL] = true;

    new Hook(["winston"], function (
      exports: any,
      name: string,
      basedir: string | undefined,
    ) {
      shimmer.wrap(exports, "createLogger", function (originalCreateLogger) {
        return function patchedCreateLogger(this: any, ...loggerArgs: any[]) {
          const loggerInstance = originalCreateLogger.apply(this, loggerArgs);

          // 3. Patch logger methods like `info`, `warn`, `error`
          ["info", "warn", "error", "debug", "verbose", "silly", "log"].forEach(
            (method) => {
              if (typeof loggerInstance[method] === "function") {
                shimmer.wrap(loggerInstance, method, function (originalMethod) {
                  return function patchedMethod(this: any, ...args: any) {
                    const callerInfo = getCallerInfo(__filename);

                    watchers.logging.addContent({
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
      if (exports.default && typeof exports.default === "object") {
        // Winston exports a default logger with methods like info, warn, error, etc.
        ["info", "warn", "error", "debug", "verbose", "silly", "log"].forEach(
          (method) => {
            if (typeof exports.default[method] === "function") {
              shimmer.wrap(exports.default, method, function (originalMethod) {
                return function patchedMethod(this: any, ...args: any) {
                  const callerInfo = getCallerInfo(__filename);

                  watchers.logging.addContent({
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
