/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type SignaleMetadata = { package: "signale"; level: string };
type SignaleData = { message: any };

export type SignaleLogEntry = BaseLogEntry<SignaleMetadata, SignaleData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: SignaleLogEntry) { 
    watchers.logging.insertRedisStream({ ...entry, created_at: timestamp() })
}

export function patchSignaleExports(exports: any, filename: string): any {
  if (!exports || typeof exports !== "object" || !exports.Signale) return exports;

  shimmer.wrap(exports.Signale.prototype, "_logger", (originalLogger) =>
    function patchedLogger(this: any, type: any, ...args: any[]) {
      const callerInfo = getCallerInfo(filename);
      log({ status: "completed", duration: 0, metadata: { package: "signale", level: type }, data: { message: args[0] }, location: { file: callerInfo.file, line: callerInfo.line } });
      return originalLogger.call(this, type, ...args);
    }
  );

  return exports;
}

