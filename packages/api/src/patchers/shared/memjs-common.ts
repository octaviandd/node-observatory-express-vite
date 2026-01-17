/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type MemjsMetadata = { package: "memjs"; command: string };
type MemjsData = { key?: string; hits?: number; misses?: number; writes?: number };

export type MemjsLogEntry = BaseLogEntry<MemjsMetadata, MemjsData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);
const METHODS = ["get", "set", "delete", "replace", "increment", "decrement"] as const;

function log(entry: MemjsLogEntry) { 
    watchers.cache.insertRedisStream({ ...entry, created_at: timestamp() })
}

function getCommandData(method: string, key: string, result: any): MemjsData {
  const data: MemjsData = { key };

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

    shimmer.wrap(exports.Client.prototype, method, (original) =>
      async function patched(this: any, key: string, ...args: any[]) {
        const callerInfo = getCallerInfo(filename);
        const startTime = performance.now();

        const base = { metadata: { package: "memjs" as const, command: method } };

        try {
          const result = await original.call(this, key, ...args);
          if (result === undefined) return result;

          log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, data: getCommandData(method, key, result), ...base });
          return result;
        } catch (error: any) {
          log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), data: { key }, error: { name: "MemjsError", message: error?.message ?? String(error), stack: error?.stack }, ...base });
          throw error;
        }
      }
    );
  }

  return exports;
}

