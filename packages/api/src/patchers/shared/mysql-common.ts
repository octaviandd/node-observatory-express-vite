/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type MysqlMetadata = { package: "mysql"; context: string; sqlType: string };
type MysqlData = { sql: string; hostname: string; port: string | number; database: string };

export type MysqlQueryLogEntry = BaseLogEntry<MysqlMetadata, MysqlData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: MysqlQueryLogEntry) { 
    watchers.query.insertRedisStream({ ...entry, created_at: timestamp() })
}

function getSqlType(sql: string): string {
  if (!sql) return "UNKNOWN";
  const firstWord = sql.trim().split(/\s+/, 1)[0].toUpperCase();
  return ["SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER"].includes(firstWord) ? firstWord : "OTHER";
}

function shouldLogQuery(sql: string): boolean {
  return !sql.toLowerCase().includes("insert into observatory_entries");
}

function patchQuery(target: any, contextName: string, filename: string, getConfig: (ctx: any) => any) {
  if (!target || typeof target.query !== "function") return;

  shimmer.wrap(target, "query", (originalQuery: Function) =>
    function patchedQuery(this: any, sqlOrOptions: any, values?: any, callback?: Function) {
      if ((this as any)._isLoggerQuery) {
        return originalQuery.call(this, sqlOrOptions, values, callback);
      }

      const sql = typeof sqlOrOptions === "string" ? sqlOrOptions : sqlOrOptions.sql;

      if (!shouldLogQuery(sql)) {
        return originalQuery.call(this, sqlOrOptions, values, callback);
      }

      const startTime = performance.now();
      const callerInfo = getCallerInfo(filename);
      const config = getConfig(this);

      const base = {
        metadata: { package: "mysql" as const, context: contextName, sqlType: getSqlType(sql) },
        data: { sql, hostname: config?.host || "unknown", port: config?.port || "unknown", database: config?.database || "unknown" },
      };

      return new Promise((resolve, reject) => {
        originalQuery.call(this, sqlOrOptions, values, (error: any, result: any) => {
          if (error) {
            log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), error: { name: "MysqlError", message: error?.message, stack: error?.stack }, ...base });
          } else {
            log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, ...base });
          }
          error ? reject(error) : resolve(result);
        });
      });
    }
  );
}

export function patchMysqlExports(exports: any, filename: string): any {
  shimmer.wrap(exports, "createConnection", (originalCreateConnection) =>
    function patchedCreateConnection(this: any, ...args: any[]) {
      const connection = originalCreateConnection.apply(this, args);
      patchQuery(connection, "Connection", filename, (ctx) => ctx.config);
      return connection;
    }
  );

  shimmer.wrap(exports, "createPool", (originalCreatePool) =>
    function patchedCreatePool(this: any, ...args: any[]) {
      const pool = originalCreatePool.apply(this, args);
      patchQuery(pool, "Pool", filename, () => ({}));
      return pool;
    }
  );

  return exports;
}

