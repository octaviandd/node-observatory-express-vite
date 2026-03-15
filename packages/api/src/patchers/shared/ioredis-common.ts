/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { ioRedisCommandsArgs } from "../../core/helpers/constants";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: CacheContent) {
  watchers.cache.insertRedisStream({ ...entry });
}

function getCommandData(
  command: string,
  args: any[],
  result: any,
  status: "completed" | "failed",
  host: string,
  port: number,
): CacheData {
  const data: CacheData = { key: args[0], method: command, status, host, port };
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

    shimmer.wrap(
      exports.prototype,
      command,
      (originalFn) =>
        async function patchedCommand(this: any, ...args: any[]) {
          const callerInfo = getCallerInfo(filename);
          const startTime = performance.now();

          try {
            const result = await originalFn.apply(this, args);

            log({
              metadata: {
                package: "ioredis",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: getCommandData(
                command,
                args,
                result,
                "completed",
                this.options?.host,
                this.options?.port,
              ),
            });

            return result;
          } catch (error: any) {
            log({
              metadata: {
                package: "ioredis",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: {
                key: args[0],
                method: command,
                status: "failed",
                host: this.options?.host,
                port: this.options?.port,
              },
              error: {
                name: "IoRedisError",
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
