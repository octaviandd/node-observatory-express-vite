/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

export const channelMethodsToPatch = ["publish"] as const;
export const presenceMethodsToPatch = [
  "enter",
  "update",
  "leave",
  "get",
  "subscribe",
] as const;
export const historyMethodsToPatch = ["history", "presenceHistory"] as const;

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: NotificationContent) {
  watchers.notifications.insertRedisStream({ ...entry });
}

export function wrapMethod(
  original: Function,
  methodName: string,
  context: { mode: "realtime" | "rest"; channel: string },
  filename: string,
) {
  return async function wrapped(this: any, ...args: any[]) {
    const startTime = performance.now();
    const callerInfo = getCallerInfo(filename);

    const data: NotificationData = {
      method: methodName,
      channel: context.channel,
      event: methodName === "publish" && args.length > 0 ? args[0] : undefined,
      payload: methodName === "publish" && args.length > 1 ? args[1] : args[0],
      options: methodName === "publish" && args.length > 2 ? args[2] : null,
    };

    try {
      const result = await original.apply(this, args);

      log({
        metadata: {
          package: "ably",
          mode: context.mode,
          duration: parseFloat((performance.now() - startTime).toFixed(2)),
          location: { file: callerInfo.file, line: callerInfo.line },
          created_at: timestamp(),
        },
        data,
      });

      return result;
    } catch (error: any) {
      log({
        metadata: {
          package: "ably",
          mode: context.mode,
          duration: parseFloat((performance.now() - startTime).toFixed(2)),
          location: { file: callerInfo.file, line: callerInfo.line },
          created_at: timestamp(),
        },
        data,
        error: {
          name: error.name || "Error",
          message: error.message,
        },
      });

      throw error;
    }
  };
}

export function patchObject(
  obj: any,
  methods: readonly string[],
  context: { mode: "realtime" | "rest"; channel: string },
  filename: string,
) {
  for (const method of methods) {
    if (typeof obj[method] === "function" && !obj[`_${method}Patched`]) {
      shimmer.wrap(obj, method, (original) =>
        typeof original === "function"
          ? wrapMethod(original, method, context, filename)
          : original,
      );
      obj[`_${method}Patched`] = true;
    }
  }
}

export function patchAblyExports(exports: any, filename: string): any {
  const ablyExports = exports.default || exports;

  if (!ablyExports?.Realtime && !ablyExports?.Rest) return exports;

  const patchConstructor = (Constructor: any, mode: "realtime" | "rest") => {
    shimmer.wrap(
      ablyExports,
      Constructor === ablyExports.Realtime ? "Realtime" : "Rest",
      (Original) =>
        function PatchedConstructor(this: any, options: any) {
          const instance = new Original(options);

          if (instance.channels?.get) {
            shimmer.wrap(
              instance.channels,
              "get",
              (originalGet) =>
                function patchedGet(
                  this: any,
                  channelName: string,
                  channelOptions?: any,
                ) {
                  const channel =
                    arguments.length > 1
                      ? originalGet.call(this, channelName, channelOptions)
                      : originalGet.call(this, channelName);

                  patchObject(
                    channel,
                    channelMethodsToPatch,
                    { mode, channel: channelName },
                    filename,
                  );

                  return channel;
                },
            );
          }

          return instance;
        },
    );
  };

  if (ablyExports.Realtime) patchConstructor(ablyExports.Realtime, "realtime");
  if (ablyExports.Rest) patchConstructor(ablyExports.Rest, "rest");

  return exports.default ? { ...exports, default: ablyExports } : ablyExports;
}
