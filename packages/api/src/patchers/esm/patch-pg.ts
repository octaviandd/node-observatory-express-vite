/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../../index";
import { getCallerInfo } from "../../utils";

const PG_PATCHED_SYMBOL = Symbol.for("node-observer:pg-patched");

/**
 * Determines if a query or execute command should be logged.
 * @param sql - The SQL query or QueryOptions object.
 */
function shouldLogQuery(sql: string): boolean {
  return !!sql && !sql.toLowerCase().includes("observatory_entries");
}

if (
  process.env.NODE_OBSERVATORY_QUERIES &&
  JSON.parse(process.env.NODE_OBSERVATORY_QUERIES).includes("pg")
) {
  if (!(global as any)[PG_PATCHED_SYMBOL]) {
    (global as any)[PG_PATCHED_SYMBOL] = true;

    new Hook(["pg"], function (exports: any, name, basedir) {
      if (!exports || typeof exports.Client !== "function") {
        return exports;
      }

      // Patch the `query` method on the Client class
      shimmer.wrap(exports.Client.prototype, "query", function (originalQuery) {
        return function patchedQuery(
          this: any,
          config: any,
          values: any[],
          callback: any,
        ) {
          if (!shouldLogQuery(config)) {
            return originalQuery.call(this, config, values, callback);
          }

          const startTime = performance.now();

          // Handle both query(config, callback) and query(config, values, callback) signatures
          if (typeof values === "function") {
            callback = values;
            values = [];
          }

          const queryText = typeof config === "string" ? config : config.text;
          const queryValues = values || [];

          const wrappedCallback = function (err: Error | null, result: any) {
            const endTime = performance.now();
            logQuery(queryText, queryValues, result, endTime - startTime, err);
            if (callback) {
              callback(err, result);
            }
          };

          return originalQuery.call(this, config, queryValues, wrappedCallback);
        };
      });

      // Patch the `query` method on the Pool class
      if (typeof exports.Pool === "function") {
        shimmer.wrap(exports.Pool.prototype, "query", function (originalQuery) {
          return function patchedQuery(
            this: any,
            config: any,
            values: any[],
            callback: any,
          ) {
            if (!shouldLogQuery(config)) {
              return originalQuery.call(this, config, values, callback);
            }

            const startTime = performance.now();

            // Handle both query(config, callback) and query(config, values, callback) signatures
            if (typeof values === "function") {
              callback = values;
              values = [];
            }

            const queryText = typeof config === "string" ? config : config.text;
            const queryValues = values || [];

            const wrappedCallback = function (err: Error | null, result: any) {
              const endTime = performance.now();
              logQuery(
                queryText,
                queryValues,
                result,
                endTime - startTime,
                err,
              );
              if (callback) {
                callback(err, result);
              }
            };

            return originalQuery.call(
              this,
              config,
              queryValues,
              wrappedCallback,
            );
          };
        });
      }

      return exports;
    });
  }

  /**
   * Logs query execution details with the originating file and line number.
   * @param queryText - The SQL query text.
   * @param queryValues - The query parameters/values.
   * @param result - The result of the query execution.
   * @param duration - The time taken to execute the query in milliseconds.
   * @param error - Optional error object, if the query fails.
   * @param stack - Captured stack trace at query initiation.
   */
  function logQuery(
    queryText: string,
    queryValues: any[],
    result: any,
    duration: number,
    error?: Error | null,
  ) {
    const callerInfo = getCallerInfo(__filename);

    const logEntry = {
      query: queryText,
      values: queryValues,
      result: result?.rows,
      rowCount: result?.rowCount,
      duration,
      package: "pg",
      file: callerInfo.file,
      line: callerInfo.line,
      error: error ? error.toString() : undefined,
    };

    if (watchers?.query) {
      watchers.query.addContent(logEntry);
    }
  }
}
