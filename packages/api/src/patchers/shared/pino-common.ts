/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type PinoMetadata = { package: "pino"; level: string };
type PinoData = { message: any };

export type PinoLogEntry = BaseLogEntry<PinoMetadata, PinoData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);
const LOG_LEVELS = ["info", "warn", "error", "debug", "trace", "fatal"] as const;

function log(entry: PinoLogEntry) { 
    watchers.logging.insertRedisStream({ ...entry, created_at: timestamp() })
}

function patchLoggerMethods(loggerInstance: any, filename: string, contextMetadata: any = {}) {
  for (const level of LOG_LEVELS) {
    if (typeof loggerInstance[level] === "function") {
      shimmer.wrap(loggerInstance, level, (originalMethod) =>
        function patchedMethod(this: any, ...logArgs: any[]) {
          const callerInfo = getCallerInfo(filename);
          log({ status: "completed", duration: 0, metadata: { package: "pino", level }, data: { message: logArgs[0] }, location: { file: callerInfo.file, line: callerInfo.line } });
          return originalMethod.apply(this, logArgs);
        }
      );
    }
  }

  if (typeof loggerInstance.child === "function") {
    shimmer.wrap(loggerInstance, "child", (originalChild) =>
      function patchedChild(this: any, childBindings: any, ...rest: any[]) {
        const childLogger = originalChild.call(this, childBindings, ...rest);
        patchLoggerMethods(childLogger, filename, { ...contextMetadata, ...childBindings });
        return childLogger;
      }
    );
  }
}

export function patchPinoExports(exports: any, filename: string): any {
  const originalPino = exports;

  function patchedPino(...args: any[]) {
    const loggerInstance = originalPino(...args);
    patchLoggerMethods(loggerInstance, filename);
    return loggerInstance;
  }

  Object.assign(patchedPino, originalPino);
  return patchedPino;
}

