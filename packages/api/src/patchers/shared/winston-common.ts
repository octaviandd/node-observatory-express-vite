/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type WinstonMetadata = { package: "winston"; level: string };
type WinstonData = { message: any };

export type WinstonLogEntry = BaseLogEntry<WinstonMetadata, WinstonData>;

const LOG_LEVELS = ["info", "warn", "error", "debug", "verbose", "silly", "log"] as const;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: WinstonLogEntry) { 
    watchers.logging.insertRedisStream({ ...entry, created_at: timestamp() })
}

function patchLoggerMethods(logger: any, filename: string) {
  for (const level of LOG_LEVELS) {
    if (typeof logger[level] === "function") {
      shimmer.wrap(logger, level, (original) =>
        function patchedMethod(this: any, ...args: any[]) {
          const callerInfo = getCallerInfo(filename);
          log({ status: "completed", duration: 0, metadata: { package: "winston", level }, data: { message: args[0] }, location: { file: callerInfo.file, line: callerInfo.line } });
          return original.apply(this, args);
        }
      );
    }
  }
}

export function patchWinstonExports(exports: any, filename: string): any {
  const winstonModule = exports.default || exports;

  if (typeof winstonModule?.createLogger === "function") {
    shimmer.wrap(winstonModule, "createLogger", (originalCreateLogger) =>
      function patchedCreateLogger(this: any, ...args: any[]) {
        const loggerInstance = originalCreateLogger.apply(this, args);
        patchLoggerMethods(loggerInstance, filename);
        return loggerInstance;
      }
    );
  }

  // Patch default logger if it exists
  if (winstonModule?.default && typeof winstonModule.default === "object") {
    patchLoggerMethods(winstonModule.default, filename);
  }

  return exports;
}