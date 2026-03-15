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

function shouldLogQuery(sql: any): boolean {
  const stack = new Error().stack as string;
  const query = typeof sql === "string" ? sql : sql?.sql;
  return (
    !!query &&
    !query.toLowerCase().includes("observatory_entries") &&
    !stack.toLowerCase().includes("basewatcher")
  );
}

function getConnectionConfig(ctx: any) {
  return {
    hostname:
      ctx.config?.host || ctx.pool?.config?.connectionConfig?.host || "unknown",
    port:
      ctx.config?.port || ctx.pool?.config?.connectionConfig?.port || "unknown",
    database:
      ctx.config?.database ||
      ctx.pool?.config?.connectionConfig?.database ||
      "unknown",
  };
}

function patchMethod(
  target: any,
  method: "query" | "execute",
  contextName: string,
  filename: string,
) {
  if (!target || typeof target[method] !== "function") return;

  shimmer.wrap(
    target,
    method,
    (original: Function) =>
      async function patched(this: any, sqlOrOptions: any, values?: any) {
        const sql =
          typeof sqlOrOptions === "string" ? sqlOrOptions : sqlOrOptions?.sql;

        if (!shouldLogQuery(sql)) {
          return original.call(this, sqlOrOptions, values);
        }

        const startTime = performance.now();
        const callerInfo = getCallerInfo(filename);

        const data: QueryData = {
          sql,
          context: contextName,
          sqlType: getSqlType(sql),
          ...getConnectionConfig(this),
        };

        try {
          const result = await original.call(this, sqlOrOptions, values);

          log({
            metadata: {
              package: "mysql2",
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
              package: "mysql2",
              duration: parseFloat((performance.now() - startTime).toFixed(2)),
              location: { file: callerInfo.file, line: callerInfo.line },
              created_at: timestamp(),
            },
            data,
            error: {
              name: "Mysql2Error",
              message: error?.message,
              stack: error?.stack,
            },
          });

          throw error;
        }
      },
  );
}

export function patchMysql2Exports(exports: any, filename: string): any {
  shimmer.wrap(
    exports,
    "createConnection",
    (originalCreateConnection: Function) =>
      async function patchedCreateConnection(this: any, ...args: any[]) {
        const connection = await originalCreateConnection.apply(this, args);
        patchMethod(connection, "query", "Connection", filename);
        patchMethod(connection, "execute", "Connection", filename);
        return connection;
      },
  );

  shimmer.wrap(
    exports,
    "createPool",
    (originalCreatePool: Function) =>
      function patchedCreatePool(this: any, ...args: any[]) {
        const pool = originalCreatePool.apply(this, args);
        patchMethod(pool, "query", "Pool", filename);
        patchMethod(pool, "execute", "Pool", filename);
        return pool;
      },
  );

  return exports;
}
