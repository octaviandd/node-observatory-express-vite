/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: QueryContent) {
  watchers.query.insertRedisStream({ ...entry });
}

function getSqlType(sql: string): string {
  if (!sql) return "UNKNOWN";
  const firstWord = sql.trim().split(/\s+/, 1)[0].toUpperCase();
  return [
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "CREATE",
    "DROP",
    "ALTER",
  ].includes(firstWord)
    ? firstWord
    : "OTHER";
}

function createPatchedQuery(context: string, filename: string) {
  return (originalQuery: Function) =>
    async function patchedQuery(this: any, ...args: any[]) {
      const startTime = performance.now();
      const callerInfo = getCallerInfo(filename);
      const obj = context === "Client.prototype._query" ? args[0] : args[1];
      const sql = obj?.sql ?? obj;

      const data: QueryData = {
        sql,
        context,
        sqlType: getSqlType(sql),
      };

      try {
        const result = await originalQuery.apply(this, args);

        log({
          metadata: {
            package: "knex",
            duration: parseFloat((performance.now() - startTime).toFixed(2)),
            location: { file: callerInfo.file, line: callerInfo.line },
            created_at: timestamp(),
          },
          data,
        });

        return result;
      } catch (error: any) {
        log({
          metadata: {
            package: "knex",
            duration: parseFloat((performance.now() - startTime).toFixed(2)),
            location: { file: callerInfo.file, line: callerInfo.line },
            created_at: timestamp(),
          },
          data,
          error: {
            name: "KnexError",
            message: error?.message,
            stack: error?.stack,
          },
        });

        throw error;
      }
    };
}

export function patchKnexExports(exports: any, filename: string): any {
  if (!exports?.Client?.prototype) return exports;

  if (typeof exports.Client.prototype._query === "function") {
    shimmer.wrap(
      exports.Client.prototype,
      "_query",
      createPatchedQuery("Client.prototype._query", filename),
    );
  } else if (typeof exports.Client.prototype.query === "function") {
    shimmer.wrap(
      exports.Client.prototype,
      "query",
      createPatchedQuery("Client.prototype.query", filename),
    );
  }

  return exports;
}
