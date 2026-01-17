/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

export const channelMethodsToPatch = ["publish"] as const;
export const presenceMethodsToPatch = ["enter", "update", "leave", "get", "subscribe"] as const;
export const historyMethodsToPatch = ["history", "presenceHistory"] as const;

type AblyMetadata = { package: "ably"; method: string; mode: "realtime" | "rest" };
type AblyData = { channel: string; event?: string; payload?: any; options?: any };

export type AblyLogEntry = BaseLogEntry<AblyMetadata, AblyData>;

function log(entry: AblyLogEntry) {
  watchers.notifications.insertRedisStream({
    ...entry,
    created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
  });
}

export function wrapMethod(
  original: Function,
  methodName: string,
  context: { mode: "realtime" | "rest"; channel: string },
  filename: string
) {
  return async function wrapped(this: any, ...args: any[]) {
    const startTime = performance.now();
    const callerInfo = getCallerInfo(filename);

    const base = {
      metadata: { package: "ably" as const, method: methodName, mode: context.mode },
      data: {
        channel: context.channel,
        event: methodName === "publish" && args.length > 0 ? args[0] : undefined,
        payload: methodName === "publish" && args.length > 1 ? args[1] : args[0],
        options: methodName === "publish" && args.length > 2 ? args[2] : null,
      },
    };

    try {
      const result = await original.apply(this, args);
      log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, ...base });
      return result;
    } catch (error: any) {
      log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), error: { name: error.name || "Error", message: error.message }, ...base });
      throw error;
    }
  };
}

export function patchObject(
  obj: any,
  methods: readonly string[],
  context: { mode: "realtime" | "rest"; channel: string },
  filename: string
) {
  for (const method of methods) {
    if (typeof obj[method] === "function" && !obj[`_${method}Patched`]) {
      shimmer.wrap(obj, method, (original) =>
        typeof original === "function" ? wrapMethod(original, method, context, filename) : original
      );
      obj[`_${method}Patched`] = true;
    }
  }
}

export function patchAblyExports(
  exports: any,
  filename: string
): any {
  const ablyExports = exports.default || exports;

  if (!ablyExports?.Realtime && !ablyExports?.Rest) return exports;

  const patchConstructor = (Constructor: any, mode: "realtime" | "rest") => {
    shimmer.wrap(ablyExports, Constructor === ablyExports.Realtime ? "Realtime" : "Rest", (Original) =>
      function PatchedConstructor(this: any, options: any) {
        const instance = new Original(options);

        if (instance.channels?.get) {
          shimmer.wrap(instance.channels, "get", (originalGet) =>
            function patchedGet(this: any, channelName: string, channelOptions?: any) {
              const channel = arguments.length > 1
                ? originalGet.call(this, channelName, channelOptions)
                : originalGet.call(this, channelName);

              patchObject(channel, channelMethodsToPatch, { mode, channel: channelName }, filename);
              return channel;
            }
          );
        }

        return instance;
      }
    );
  };

  if (ablyExports.Realtime) patchConstructor(ablyExports.Realtime, "realtime");
  if (ablyExports.Rest) patchConstructor(ablyExports.Rest, "rest");

  return exports.default ? { ...exports, default: ablyExports } : ablyExports;
}