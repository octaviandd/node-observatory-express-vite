/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { redisCommandArgs } from "../../core/helpers/constants";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: CacheContent) {
  watchers.cache.insertRedisStream({ ...entry });
}

function isObservatoryKey(args: any[]): boolean {
  const key = args[0];
  if (Array.isArray(key))
    return key.some((k: string) => k?.includes?.("observatory_entries"));
  return typeof key === "string" && key.includes("observatory_entries");
}

function shouldLogCommand(command: string, args: any[]): boolean {
  const lowerCmd = command.toLowerCase();
  if (["get", "exists", "set", "mset", "del", "mget"].includes(lowerCmd)) {
    return !isObservatoryKey(args);
  }
  return true;
}

function getCommandData(
  command: string,
  args: any[],
  result: any,
  status: "completed" | "failed",
): CacheData {
  const lowerCmd = command.toLowerCase();
  const data: CacheData = { key: args[0], method: command, status };

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

function patchRedisClient(client: any, filename: string) {
  for (const command of Object.keys(redisCommandArgs)) {
    if (typeof client[command] === "function") {
      shimmer.wrap(
        client,
        command,
        (originalFn: any) =>
          async function patchedCommand(this: any, ...args: any[]) {
            if (isObservatoryKey(args)) return originalFn.apply(this, args);

            const callerInfo = getCallerInfo(filename);
            const startTime = performance.now();

            try {
              const result = await originalFn.apply(this, args);
              if (!shouldLogCommand(command, args)) return result;

              log({
                metadata: {
                  package: "redis",
                  duration: parseFloat(
                    (performance.now() - startTime).toFixed(2),
                  ),
                  location: { file: callerInfo.file, line: callerInfo.line },
                  created_at: timestamp(),
                },
                data: getCommandData(command, args, result, "completed"),
              });

              return result;
            } catch (error: any) {
              log({
                metadata: {
                  package: "redis",
                  duration: parseFloat(
                    (performance.now() - startTime).toFixed(2),
                  ),
                  location: { file: callerInfo.file, line: callerInfo.line },
                  created_at: timestamp(),
                },
                data: { key: args[0], method: command, status: "failed" },
                error: {
                  name: "RedisError",
                  message: error?.message ?? String(error),
                  stack: error?.stack,
                },
              });

              throw error;
            }
          },
      );
    }
  }
}

export function patchRedisExports(exports: any, filename: string): any {
  if (typeof exports?.createClient !== "function") return exports;

  shimmer.wrap(
    exports,
    "createClient",
    (originalCreate) =>
      function patchedCreateClient(this: any, ...args: any[]) {
        const client = originalCreate.apply(this, args);
        patchRedisClient(client, filename);
        return client;
      },
  );

  return exports;
}
