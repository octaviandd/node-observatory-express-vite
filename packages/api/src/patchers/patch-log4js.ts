/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../../index";
import { getCallerInfo } from "../../utils";

// Create a global symbol to track if log4js has been patched
const LOG4JS_PATCHED_SYMBOL = Symbol.for("node-observer:log4js-patched");

if (
  process.env.NODE_OBSERVATORY_LOGGING &&
  JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("log4js")
) {
  // Check if log4js has already been patched
  if (!(global as any)[LOG4JS_PATCHED_SYMBOL]) {
    // Mark log4js as patched
    (global as any)[LOG4JS_PATCHED_SYMBOL] = true;

    // Intercepts `require("log4js")`
    new Hook(["log4js"], function (exports, name, basedir) {
      // `exports` is the log4js module.
      // We'll patch `getLogger` so that we can intercept the returned logger instance.

      // Wrap the getLogger function
      shimmer.wrap(
        exports as any,
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

                    watchers.logging.addContent({
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
