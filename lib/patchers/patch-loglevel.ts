/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";

// Create a global symbol to track if loglevel has been patched
const LOGLEVEL_PATCHED_SYMBOL = Symbol.for("node-observer:loglevel-patched");

if (
  process.env.NODE_OBSERVATORY_LOGGING &&
  JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("loglevel")
) {
  // Check if loglevel has already been patched
  if (!(global as any)[LOGLEVEL_PATCHED_SYMBOL]) {
    // Mark loglevel as patched
    (global as any)[LOGLEVEL_PATCHED_SYMBOL] = true;

    /**
     * Hook "loglevel" to patch its logging functionality.
     */
    new Hook(["loglevel"], function (exports: any, name, basedir) {
      // `exports` is the object returned by require("loglevel").
      //@ts-ignore
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
              watchers.logging.addContent(logContent);

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
                  watchers.logging.addContent(logContent);

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
