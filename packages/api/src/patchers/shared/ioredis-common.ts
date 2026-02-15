/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { ioRedisCommandsArgs } from "../../core/helpers/constants";
import { getCallerInfo } from "../../core/helpers/helpers";

type IoRedisMetadata = { package: "ioredis"; command: string; host?: string; port?: number };
type IoRedisData = { key?: string; hits?: number; misses?: number; writes?: number };

export type IoRedisLogEntry = BaseLogEntry<IoRedisMetadata, IoRedisData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: IoRedisLogEntry) { 
    watchers.cache.insertRedisStream({ ...entry, created_at: timestamp() })
}

function getCommandData(command: string, args: any[], result: any): IoRedisData {
  const data: IoRedisData = { key: args[0] };
  const lowerCmd = command.toLowerCase();

  if (lowerCmd === "get") {
    const isHit = result !== undefined && result !== null;
    data.hits = isHit ? 1 : 0;
    data.misses = isHit ? 0 : 1;
  } else if (lowerCmd === "exists") {
    data.hits = result ? 1 : 0;
    data.misses = result ? 0 : 1;
  } else if (["set", "del"].includes(lowerCmd)) {
    data.writes = 1;
  }

  return data;
}

export function patchIoRedisExports(exports: any, filename: string): any {
  if (!exports?.prototype) return exports;

  for (const command of Object.keys(ioRedisCommandsArgs)) {
    if (typeof exports.prototype[command] !== "function") continue;

    shimmer.wrap(exports.prototype, command, (originalFn) =>
      async function patchedCommand(this: any, ...args: any[]) {
        const callerInfo = getCallerInfo(filename);
        const startTime = performance.now();
        const base = { metadata: { package: "ioredis" as const, command, host: this.options?.host, port: this.options?.port } };

        try {
          const result = await originalFn.apply(this, args);
          log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, data: getCommandData(command, args, result), ...base });
          return result;
        } catch (error: any) {
          log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), data: { key: args[0] }, error: { name: "IoRedisError", message: error?.message ?? String(error), stack: error?.stack }, ...base });
          throw error;
        }
      }
    );
  }

  return exports;
}

