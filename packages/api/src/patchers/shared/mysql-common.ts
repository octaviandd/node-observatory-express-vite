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

function shouldLogQuery(sql: string): boolean {
  return !sql.toLowerCase().includes("insert into observatory_entries");
}

function patchQuery(
  target: any,
  contextName: string,
  filename: string,
  getConfig: (ctx: any) => any,
) {
  if (!target || typeof target.query !== "function") return;

  shimmer.wrap(
    target,
    "query",
    (originalQuery: Function) =>
      function patchedQuery(
        this: any,
        sqlOrOptions: any,
        values?: any,
        callback?: Function,
      ) {
        if ((this as any)._isLoggerQuery) {
          return originalQuery.call(this, sqlOrOptions, values, callback);
        }

        const sql =
          typeof sqlOrOptions === "string" ? sqlOrOptions : sqlOrOptions.sql;

        if (!shouldLogQuery(sql)) {
          return originalQuery.call(this, sqlOrOptions, values, callback);
        }

        const startTime = performance.now();
        const callerInfo = getCallerInfo(filename);
        const config = getConfig(this);

        const data: QueryData = {
          sql,
          context: contextName,
          sqlType: getSqlType(sql),
          hostname: config?.host || "unknown",
          port: config?.port || "unknown",
          database: config?.database || "unknown",
        };

        return new Promise((resolve, reject) => {
          originalQuery.call(
            this,
            sqlOrOptions,
            values,
            (error: any, result: any) => {
              if (error) {
                log({
                  metadata: {
                    package: "mysql",
                    duration: parseFloat(
                      (performance.now() - startTime).toFixed(2),
                    ),
                    location: { file: callerInfo.file, line: callerInfo.line },
                    created_at: timestamp(),
                  },
                  data,
                  error: {
                    name: "MysqlError",
                    message: error?.message,
                    stack: error?.stack,
                  },
                });
              } else {
                log({
                  metadata: {
                    package: "mysql",
                    duration: parseFloat(
                      (performance.now() - startTime).toFixed(2),
                    ),
                    location: { file: callerInfo.file, line: callerInfo.line },
                    created_at: timestamp(),
                  },
                  data,
                });
              }

              error ? reject(error) : resolve(result);
            },
          );
        });
      },
  );
}

export function patchMysqlExports(exports: any, filename: string): any {
  shimmer.wrap(
    exports,
    "createConnection",
    (originalCreateConnection) =>
      function patchedCreateConnection(this: any, ...args: any[]) {
        const connection = originalCreateConnection.apply(this, args);
        patchQuery(connection, "Connection", filename, (ctx) => ctx.config);
        return connection;
      },
  );

  shimmer.wrap(
    exports,
    "createPool",
    (originalCreatePool) =>
      function patchedCreatePool(this: any, ...args: any[]) {
        const pool = originalCreatePool.apply(this, args);
        patchQuery(pool, "Pool", filename, () => ({}));
        return pool;
      },
  );

  return exports;
}
