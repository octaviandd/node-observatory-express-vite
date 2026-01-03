/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers, patchedGlobal } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";

if (
  process.env.NODE_OBSERVATORY_LOGGING &&
  JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("loglevel")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LOGLEVEL_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LOGLEVEL_PATCHED_SYMBOL] = true;

    new Hook(["loglevel"], function (exports: any) {
      if (
        !exports ||
        typeof exports !== "object" ||
        typeof exports.getLogger !== "function"
      ) {
        return exports;
      }

      // Wrap default log methods (trace, debug, info, warn, error)
      ["trace", "debug", "info", "warn", "error"].forEach((method) => {
        if (typeof exports[method] === "function") {
          shimmer.wrap(exports, method, function (originalMethod) {
            return function patchedMethod(this: any, ...args: any[]) {
              const callerInfo = getCallerInfo(__filename);
              const logContent = {
                package: "loglevel",
                level: method,
                message: args[0],
                file: callerInfo.file,
                line: callerInfo.line,
              };

              // Log the message content
              watchers.logging.insertRedisStream(logContent);

              // Call the original method
              return originalMethod.apply(this, args);
            };
          });
        }
      });

      // Wrap custom loggers if needed
      shimmer.wrap(exports, "getLogger", function (originalGetLoggerFn) {
        return function patchedGetLogger(this: any, ...args: any[]) {
          const logger = originalGetLoggerFn.apply(this, args);

          ["trace", "debug", "info", "warn", "error"].forEach((method) => {
            if (typeof logger[method] === "function") {
              shimmer.wrap(logger, method, function (originalMethod) {
                return function patchedLoggerMethod(
                  this: any,
                  ...logArgs: any[]
                ) {
                  const logContent = {
                    package: "loglevel",
                    logger: args[0],
                    level: method,
                    message: logArgs,
                  };

                  // Log the message content
                  watchers.logging.insertRedisStream(logContent);

                  // Call the original method
                  return originalMethod.apply(this, logArgs);
                };
              });
            }
          });

          return logger;
        };
      });
      return exports;
    });
  }
}
