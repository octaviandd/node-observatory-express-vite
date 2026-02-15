/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type LevelMetadata = { package: "level"; command: string };
type LevelData = { key?: string; hits?: number; misses?: number; writes?: number };

export type LevelLogEntry = BaseLogEntry<LevelMetadata, LevelData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);
const METHODS = ["put", "del", "get"] as const;

function log(entry: LevelLogEntry) { 
    watchers.cache.insertRedisStream({ ...entry, created_at: timestamp() })
}

export function patchLevelExports(exports: any, filename: string): any {
  if (!exports?.Level || typeof exports.Level !== "function") return exports;

  shimmer.wrap(exports, "Level", (originalLevel) =>
    function patchedLevel(this: any, location: string, options?: any) {
      const db = new originalLevel(location, options);

      for (const method of METHODS) {
        if (typeof db[method] !== "function") continue;

        shimmer.wrap(db, method, (originalMethod) =>
          async function patchedMethod(this: any, ...args: any[]) {
            const callerInfo = getCallerInfo(filename);
            const startTime = performance.now();

            const base = { metadata: { package: "level" as const, command: method } };

            try {
              if (method === "get") {
                try {
                  const result = await originalMethod.apply(this, args);
                  const isHit = result !== undefined && result !== null && result !== false;
                  log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, data: { key: args[0], hits: isHit ? 1 : 0, misses: isHit ? 0 : 1 }, ...base });
                  return result;
                } catch (error: any) {
                  if (error.code === "LEVEL_NOT_FOUND") {
                    log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, data: { key: args[0], hits: 0, misses: 1 }, ...base });
                  } else {
                    log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), data: { key: args[0] }, error: { name: "LevelError", message: error.message, stack: error.stack }, ...base });
                  }
                  throw error;
                }
              }

              const result = await originalMethod.apply(this, args);
              log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, data: { key: args[0], writes: 1 }, ...base });
              return result;
            } catch (error: any) {
              log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), data: { key: args[0] }, error: { name: "LevelError", message: error?.message ?? String(error), stack: error?.stack }, ...base });
              throw error;
            }
          }
        );
      }

      return db;
    }
  );

  return exports;
}

