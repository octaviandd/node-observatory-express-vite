/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type Log4jsMetadata = { package: "log4js"; level: string };
type Log4jsData = { message: any };

export type Log4jsLogEntry = BaseLogEntry<Log4jsMetadata, Log4jsData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);
const LOG_LEVELS = ["info", "warn", "error", "debug", "trace", "fatal", "mark"] as const;

function log(entry: Log4jsLogEntry) { 
    watchers.logging.insertRedisStream({ ...entry, created_at: timestamp() })
}

export function patchLog4jsExports(exports: any, filename: string): any {
  if (typeof exports?.getLogger !== "function") return exports;

  shimmer.wrap(exports, "getLogger", (originalFn: Function) =>
    function patchedGetLogger(this: any, ...loggerArgs: any[]) {
      const loggerInstance = originalFn.apply(this, loggerArgs);

      for (const level of LOG_LEVELS) {
        if (typeof loggerInstance[level] === "function") {
          shimmer.wrap(loggerInstance, level, (originalMethod) =>
            function patchedMethod(this: any, ...args: any[]) {
              const callerInfo = getCallerInfo(filename);
              log({ status: "completed", duration: 0, metadata: { package: "log4js", level }, data: { message: args[0] }, location: { file: callerInfo.file, line: callerInfo.line } });
              return originalMethod.apply(this, args);
            }
          );
        }
      }

      return loggerInstance;
    }
  );

  return exports;
}

