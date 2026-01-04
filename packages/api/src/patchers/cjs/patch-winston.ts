/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { patchedGlobal, watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";

if (process.env.NODE_OBSERVATORY_LOGGING && JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("winston")) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.WINSTON_PATCHED_SYMBOL]) {
    (global as typeof patchedGlobal)[PATCHERS_GLOBAL_SYMBOLS.WINSTON_PATCHED_SYMBOL] = true;

    new Hook(["winston"], function (exports: any) {
      shimmer.wrap(exports, "createLogger", function (originalCreateLogger) {
        return function patchedCreateLogger(this: any, ...loggerArgs: unknown[]) {
          const loggerInstance = originalCreateLogger.apply(this, loggerArgs);

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
                      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
                    });

                    return originalMethod.apply(this, args);
                  };
                });
              }
            },
          );

          return loggerInstance;
        };
      });

      // Patch the default logger (e.g., `winston.info(...)`) if needed
      if (exports.default && typeof exports.default === "object") {
        ["info", "warn", "error", "debug", "verbose", "silly", "log"].forEach(
          (method) => {
            if (typeof exports.default[method] === "function") {
              shimmer.wrap(exports.default, method, function (originalMethod) {
                return function patchedMethod(this: any, ...args: any) {
                  const callerInfo = getCallerInfo(__filename);

                  watchers.logging.insertRedisStream({
                    level: method,
                    package: "winston",
                    message: args[0],
                    meta: args[1] || {},
                    file: callerInfo.file,
                    line: callerInfo.line,
                    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
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
