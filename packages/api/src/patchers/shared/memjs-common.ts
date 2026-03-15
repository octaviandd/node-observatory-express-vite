/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

const METHODS = [
  "get",
  "set",
  "delete",
  "replace",
  "increment",
  "decrement",
] as const;

function log(entry: CacheContent) {
  watchers.cache.insertRedisStream({ ...entry });
}

function getCommandData(
  method: string,
  key: string,
  result: any,
  status: "completed" | "failed",
): CacheData {
  const data: CacheData = { key, method, status };

  if (method === "get") {
    const isHit = result?.value !== undefined && result?.value !== null;
    data.hits = isHit ? 1 : 0;
    data.misses = !isHit ? 1 : 0;
  } else {
    data.writes = 1;
  }

  return data;
}

export function patchMemjsExports(exports: any, filename: string): any {
  if (!exports || typeof exports.Client !== "function") return exports;

  for (const method of METHODS) {
    if (typeof exports.Client.prototype[method] !== "function") continue;

    shimmer.wrap(
      exports.Client.prototype,
      method,
      (original) =>
        async function patched(this: any, key: string, ...args: any[]) {
          const callerInfo = getCallerInfo(filename);
          const startTime = performance.now();

          try {
            const result = await original.call(this, key, ...args);
            if (result === undefined) return result;

            log({
              metadata: {
                package: "memjs",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: getCommandData(method, key, result, "completed"),
            });

            return result;
          } catch (error: any) {
            log({
              metadata: {
                package: "memjs",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: { key, method, status: "failed" },
              error: {
                name: "MemjsError",
                message: error?.message ?? String(error),
                stack: error?.stack,
              },
            });

            throw error;
          }
        },
    );
  }

  return exports;
}
