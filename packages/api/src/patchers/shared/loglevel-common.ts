/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type LoglevelMetadata = { package: "loglevel"; level: string; logger?: string };
type LoglevelData = { message: any };

export type LoglevelLogEntry = BaseLogEntry<LoglevelMetadata, LoglevelData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);
const LOG_LEVELS = ["trace", "debug", "info", "warn", "error"] as const;

function log(entry: LoglevelLogEntry) { 
    watchers.logging.insertRedisStream({ ...entry, created_at: timestamp() })
}

export function patchLoglevelExports(exports: any, filename: string): any {
  if (!exports || typeof exports !== "object" || typeof exports.getLogger !== "function") return exports;

  // Patch default logger methods
  for (const level of LOG_LEVELS) {
    if (typeof exports[level] === "function") {
      shimmer.wrap(exports, level, (originalMethod) =>
        function patchedMethod(this: any, ...args: any[]) {
          const callerInfo = getCallerInfo(filename);
          log({ status: "completed", duration: 0, metadata: { package: "loglevel", level }, data: { message: args[0] }, location: { file: callerInfo.file, line: callerInfo.line } });
          return originalMethod.apply(this, args);
        }
      );
    }
  }

  // Patch getLogger
  shimmer.wrap(exports, "getLogger", (originalGetLoggerFn) =>
    function patchedGetLogger(this: any, ...args: any[]) {
      const logger = originalGetLoggerFn.apply(this, args);
      const loggerName = args[0];

      for (const level of LOG_LEVELS) {
        if (typeof logger[level] === "function") {
          shimmer.wrap(logger, level, (originalMethod) =>
            function patchedLoggerMethod(this: any, ...logArgs: any[]) {
              const callerInfo = getCallerInfo(filename);
              log({ status: "completed", duration: 0, metadata: { package: "loglevel", level, logger: loggerName }, data: { message: logArgs[0] }, location: { file: callerInfo.file, line: callerInfo.line } });
              return originalMethod.apply(this, logArgs);
            }
          );
        }
      }

      return logger;
    }
  );

  return exports;
}

