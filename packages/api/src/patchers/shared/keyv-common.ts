/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type KeyvMetadata = { package: "keyv"; command: string };
type KeyvData = { key?: any; hits?: number; misses?: number; writes?: number };

export type KeyvLogEntry = BaseLogEntry<KeyvMetadata, KeyvData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: KeyvLogEntry) { 
    watchers.cache.insertRedisStream({ ...entry, created_at: timestamp() })
}

function getCommandData(method: string, key: any, result: any): KeyvData {
  const data: KeyvData = { key };

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
    shimmer.wrap(exports.Keyv.prototype, method, (original) =>
      async function patched(this: any, key: any, ...args: any[]) {
        const callerInfo = getCallerInfo(filename);
        const startTime = performance.now();

        const base = { metadata: { package: "keyv" as const, command: method } };

        try {
          const result = await original.call(this, key, ...args);
          log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, data: getCommandData(method, key, result), ...base });
          return result;
        } catch (error: any) {
          log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), data: { key }, error: { name: "KeyvError", message: error?.message ?? String(error), stack: error?.stack }, ...base });
          throw error;
        }
      }
    );
  }

  return exports;
}

