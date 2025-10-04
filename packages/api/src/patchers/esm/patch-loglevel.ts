/** @format */

import { addHook, Namespace } from "import-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../../../index.js";
import { getCallerInfo } from "../../../utils.js";

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
    addHook((exports: any, name: Namespace, baseDir?: string) => {
      // Only patch 'loglevel' module
      // if (name !== 'loglevel') {
      //   return exports;
      // }

      // Handle both default and named exports
      const loglevelModule = exports.default || exports;

      // `loglevelModule` is the object returned by import loglevel.
      //@ts-ignore
      if (
        !loglevelModule ||
        typeof loglevelModule !== "object" ||
        typeof loglevelModule.getLogger !== "function"
      ) {
        return exports;
      }

      // Wrap default log methods (trace, debug, info, warn, error)
      ["trace", "debug", "info", "warn", "error"].forEach((method) => {
        if (typeof loglevelModule[method] === "function") {
          shimmer.wrap(loglevelModule, method, function (originalMethod) {
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
      shimmer.wrap(loglevelModule, "getLogger", function (originalGetLoggerFn) {
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
