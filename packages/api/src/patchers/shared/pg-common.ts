/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type PgMetadata = { package: "pg" };
type PgData = { query: string; rowCount?: number };

export type PgQueryLogEntry = BaseLogEntry<PgMetadata, PgData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: PgQueryLogEntry) {watchers?.query?.insertRedisStream({ ...entry, created_at: timestamp() })
}

function shouldLogQuery(sql: string): boolean {
  return !!sql && !sql.toLowerCase().includes("observatory_entries");
}

function patchQueryMethod(target: any, filename: string) {
  if (typeof target?.query !== "function") return;

  shimmer.wrap(target, "query", (originalQuery) =>
    function patchedQuery(this: any, config: any, values: any[], callback: any) {
      if (!shouldLogQuery(typeof config === "string" ? config : config?.text)) {
        return originalQuery.call(this, config, values, callback);
      }

      const startTime = performance.now();
      const callerInfo = getCallerInfo(filename);

      if (typeof values === "function") {
        callback = values;
        values = [];
      }

      const queryText = typeof config === "string" ? config : config.text;
      const queryValues = values || [];

      const base = { metadata: { package: "pg" as const } };

      const wrappedCallback = (err: Error | null, result: any) => {
        if (err) {
          log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), data: { query: queryText }, error: { name: "PgError", message: err.message, stack: err.stack }, ...base });
        } else {
          log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, data: { query: queryText, rowCount: result?.rowCount }, ...base });
        }
        if (callback) callback(err, result);
      };

      return originalQuery.call(this, config, queryValues, wrappedCallback);
    }
  );
}

export function patchPgExports(exports: any, filename: string): any {
  if (!exports || typeof exports.Client !== "function") return exports;

  patchQueryMethod(exports.Client.prototype, filename);

  if (typeof exports.Pool === "function") {
    patchQueryMethod(exports.Pool.prototype, filename);
  }

  return exports;
}

