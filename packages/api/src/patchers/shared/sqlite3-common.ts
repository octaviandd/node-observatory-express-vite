/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type Sqlite3Metadata = { package: "sqlite3"; method: string };
type Sqlite3Data = { sql: string };

export type Sqlite3LogEntry = BaseLogEntry<Sqlite3Metadata, Sqlite3Data>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: Sqlite3LogEntry) { 
    watchers.database.insertRedisStream({ ...entry, created_at: timestamp() })
}

const METHODS_TO_PATCH = ["all", "get", "run", "each", "exec", "prepare"] as const;

function createPatchedMethod(method: string, filename: string) {
  return function (originalMethod: Function) {
    return function patchedMethod(this: any, sql: string, ...args: any[]) {
      const startTime = performance.now();
      const callerInfo = getCallerInfo(filename);

      const lastArg = args[args.length - 1];
      const hasCallback = typeof lastArg === "function";
      const params = hasCallback ? args.slice(0, -1) : args;
      const callback = hasCallback ? lastArg : undefined;

      const base = { metadata: { package: "sqlite3" as const, method } };

      const handleResult = (err: Error | null) => {
        if (err) {
          log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), data: { sql }, error: { name: "Sqlite3Error", message: err.message, stack: err.stack }, ...base });
        } else {
          log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, data: { sql }, ...base });
        }
      };

      if (!callback) {
        return new Promise((resolve, reject) => {
          originalMethod.call(this, sql, ...params, (err: Error, result: any) => {
            handleResult(err);
            err ? reject(err) : resolve(result);
          });
        });
      }

      return originalMethod.call(this, sql, ...params, (err: Error, result: any) => {
        handleResult(err);
        callback(err, result);
      });
    };
  };
}

export function patchSqlite3Exports(exports: any, filename: string): any {
  const sqlite3Module = exports.default || exports;

  if (!sqlite3Module?.Database) return exports;

  for (const method of METHODS_TO_PATCH) {
    if (typeof sqlite3Module.Database.prototype[method] === "function") {
      shimmer.wrap(
        sqlite3Module.Database.prototype,
        method,
        createPatchedMethod(method, filename)
      );
    }
  }

  return exports;
}