/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type BunyanMetadata = { package: "bunyan"; level: string };
type BunyanData = { message: any };

export type BunyanLogEntry = BaseLogEntry<BunyanMetadata, BunyanData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);
const LOG_LEVELS = ["info", "warn", "error", "debug", "trace", "fatal"] as const;

function log(entry: BunyanLogEntry) { 
    watchers.logging.insertRedisStream({ ...entry, created_at: timestamp() })
}

function patchLoggerMethods(loggerInstance: any, filename: string, contextMetadata: any = {}) {
  for (const level of LOG_LEVELS) {
    if (typeof loggerInstance[level] === "function") {
      shimmer.wrap(loggerInstance, level, (originalMethod) =>
        function patchedMethod(this: any, ...args: any[]) {
          const callerInfo = getCallerInfo(filename);
          log({ status: "completed", duration: 0, metadata: { package: "bunyan", level }, data: { message: args[0] }, location: { file: callerInfo.file, line: callerInfo.line } });
          return originalMethod.apply(this, args);
        }
      );
    }
  }

  if (typeof loggerInstance.child === "function") {
    shimmer.wrap(loggerInstance, "child", (originalChild) =>
      function patchedChild(this: any, childBindings: any) {
        const childLogger = originalChild.call(this, childBindings);
        patchLoggerMethods(childLogger, filename, { ...contextMetadata, ...childBindings });
        return childLogger;
      }
    );
  }
}

export function patchBunyanExports(exports: any, filename: string): any {
  if (typeof exports?.createLogger !== "function") return exports;

  shimmer.wrap(exports, "createLogger", (originalFn: Function) =>
    function patchedCreateLogger(this: any, ...loggerArgs: any[]) {
      const loggerInstance = originalFn.apply(this, loggerArgs);
      patchLoggerMethods(loggerInstance, filename, loggerArgs[0] || {});
      return loggerInstance;
    }
  );

  return exports;
}

