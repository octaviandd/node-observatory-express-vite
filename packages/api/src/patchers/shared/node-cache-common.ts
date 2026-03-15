/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { nodeCacheCommandsArgs } from "../../core/helpers/constants";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: CacheContent) {
  watchers.cache.insertRedisStream({ ...entry });
}

function getCommandData(
  method: string,
  args: any[],
  result: any,
  status: "completed" | "failed",
): CacheData {
  const data: CacheData = { key: args[0], method, status };

  if (["get", "has", "take"].includes(method)) {
    const isHit = result !== undefined && result !== null && result !== false;
    data.hits = isHit ? 1 : 0;
    data.misses = !isHit ? 1 : 0;
  } else if (["set", "del"].includes(method) && !Array.isArray(args[0])) {
    data.writes = 1;
  }

  return data;
}

export function patchNodeCacheExports(exports: any, filename: string): any {
  if (!exports?.prototype) return exports;

  for (const method of Object.keys(nodeCacheCommandsArgs)) {
    if (typeof exports.prototype[method] !== "function") continue;

    shimmer.wrap(
      exports.prototype,
      method,
      (originalFn) =>
        function patchedMethod(this: any, ...args: any[]) {
          const callerInfo = getCallerInfo(filename);
          const startTime = performance.now();

          try {
            const result = originalFn.apply(this, args);

            log({
              metadata: {
                package: "node-cache",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: getCommandData(method, args, result, "completed"),
            });

            return result;
          } catch (error: any) {
            log({
              metadata: {
                package: "node-cache",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: { key: args[0], method: method, status: "failed" },
              error: {
                name: "NodeCacheError",
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
