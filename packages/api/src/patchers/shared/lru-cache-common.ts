/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";
import { LRUCacheCommandArgsMapping } from "../../core/helpers/constants";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: CacheContent) {
  watchers?.cache?.insertRedisStream({ ...entry });
}

function getCommandData(
  method: string,
  args: any[],
  argNames: string[],
  result: any,
  status: "completed" | "failed",
): CacheData {
  const data: CacheData = {
    key: argNames.includes("key") ? args[argNames.indexOf("key")] : undefined,
    method,
    status,
  };

  if (method === "get") {
    const isHit = result !== undefined && result !== null;
    data.hits = isHit ? 1 : 0;
    data.misses = isHit ? 0 : 1;
  } else if (method === "has") {
    data.hits = result ? 1 : 0;
    data.misses = result ? 0 : 1;
  } else if (["set", "del"].includes(method)) {
    data.writes = 1;
  }

  return data;
}

export function patchLruCacheExports(exports: any, filename: string): any {
  const LRUCacheClass = exports?.LRUCache || exports;
  if (!LRUCacheClass?.prototype) return exports;

  for (const method of Object.keys(LRUCacheCommandArgsMapping)) {
    if (typeof LRUCacheClass.prototype[method] !== "function") continue;

    shimmer.wrap(
      LRUCacheClass.prototype,
      method,
      (originalFn) =>
        function patchedMethod(this: any, ...args: any[]) {
          const callerInfo = getCallerInfo(filename);
          const startTime = performance.now();
          const argNames =
            LRUCacheCommandArgsMapping[
              method as keyof typeof LRUCacheCommandArgsMapping
            ] || [];

          try {
            const result = originalFn.apply(this, args);

            log({
              metadata: {
                package: "lru-cache",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: getCommandData(method, args, argNames, result, "completed"),
            });

            return result;
          } catch (error: any) {
            log({
              metadata: {
                package: "lru-cache",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: { key: args[0], method, status: "failed" },
              error: {
                name: "LruCacheError",
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
