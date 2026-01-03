/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers, patchedGlobal } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";

if (
  process.env.NODE_OBSERVATORY_LOGGING &&
  JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("bunyan")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.BUNYAN_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.BUNYAN_PATCHED_SYMBOL] = true;

    new Hook(["bunyan"], function (exports) {
      function patchLoggerMethods(loggerInstance: any, contextMetadata = {}) {
        ["info", "warn", "error", "debug", "trace", "fatal"].forEach(
          (method) => {
            if (typeof loggerInstance[method] === "function") {
              shimmer.wrap(loggerInstance, method, function (originalMethod) {
                return function patchedMethod(this: any, ...args: any[]) {
                  const callerInfo = getCallerInfo(__filename);

                  watchers.logging.insertRedisStream({
                    level: method,
                    package: "bunyan",
                    message: args[0],
                    metadata:
                      typeof args[0] === "object" ? args[0] : args[1] || {},
                    context: contextMetadata,
                    file: callerInfo.file,
                    line: callerInfo.line,
                  });

                  return originalMethod.apply(this, args);
                };
              });
            }
          },
        );

        // Patch child method for nested loggers
        if (typeof loggerInstance.child === "function") {
          shimmer.wrap(loggerInstance, "child", function (originalChild) {
            return function patchedChild(this: any, childBindings: any) {
              const childLogger = originalChild.call(this, childBindings);
              const mergedContext = {
                ...contextMetadata,
                ...childBindings,
              };
              patchLoggerMethods(childLogger, mergedContext);
              return childLogger;
            };
          });
        }
      }

      // 2. Patch createLogger
      shimmer.wrap(
        exports as any,
        "createLogger",
        function (originalFn: Function) {
          return function patchedCreateLogger(this: any, ...loggerArgs: any[]) {
            // Call the original createLogger
            const loggerInstance = originalFn.apply(this, loggerArgs);
            patchLoggerMethods(loggerInstance, loggerArgs[0] || {});
            return loggerInstance;
          };
        },
      );

      return exports;
    });
  }
}
