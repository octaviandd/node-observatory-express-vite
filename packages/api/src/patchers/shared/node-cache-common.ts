/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { nodeCacheCommandsArgs } from "../../core/helpers/constants";
import { getCallerInfo } from "../../core/helpers/helpers";

type NodeCacheMetadata = { package: "node-cache"; command: string };
type NodeCacheData = { key?: string; hits?: number; misses?: number; writes?: number };

export type NodeCacheLogEntry = BaseLogEntry<NodeCacheMetadata, NodeCacheData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: NodeCacheLogEntry) { 
    watchers.cache.insertRedisStream({ ...entry, created_at: timestamp() })
}

function getCommandData(method: string, args: any[], result: any): NodeCacheData {
  const data: NodeCacheData = { key: args[0] };

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

    shimmer.wrap(exports.prototype, method, (originalFn) =>
      function patchedMethod(this: any, ...args: any[]) {
        const callerInfo = getCallerInfo(filename);
        const startTime = performance.now();

        const base = { metadata: { package: "node-cache" as const, command: method } };

        try {
          const result = originalFn.apply(this, args);
          log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, data: getCommandData(method, args, result), ...base });
          return result;
        } catch (error: any) {
          log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), data: { key: args[0] }, error: { name: "NodeCacheError", message: error?.message ?? String(error), stack: error?.stack }, ...base });
          throw error;
        }
      }
    );
  }

  return exports;
}

