/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: CacheContent) {
  watchers.cache.insertRedisStream({ ...entry });
}

function getCommandData(
  method: string,
  key: any,
  result: any,
  status: "completed" | "failed",
): CacheData {
  const data: CacheData = { key, method, status };

  if (["get", "has"].includes(method)) {
    const isHit = result !== undefined && result !== null && result !== false;
    data.hits = isHit ? 1 : 0;
    data.misses = isHit ? 0 : 1;
  } else {
    data.writes = 1;
  }

  return data;
}

const METHODS = ["set", "get", "delete", "has"] as const;

export function patchKeyvExports(exports: any, filename: string): any {
  if (!exports?.Keyv || typeof exports.Keyv !== "function") return exports;

  for (const method of METHODS) {
    shimmer.wrap(
      exports.Keyv.prototype,
      method,
      (original) =>
        async function patched(this: any, key: any, ...args: any[]) {
          const callerInfo = getCallerInfo(filename);
          const startTime = performance.now();

          try {
            const result = await original.call(this, key, ...args);

            log({
              metadata: {
                package: "keyv",
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
                package: "keyv",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: { key, method, status: "failed" },
              error: {
                name: "KeyvError",
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
