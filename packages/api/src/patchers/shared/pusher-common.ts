/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: NotificationContent) {
  watchers.notifications.insertRedisStream({ ...entry });
}

function createHandler(method: "trigger" | "triggerBatch", filename: string) {
  return function (original: Function) {
    return function patched(this: any, ...args: any[]) {
      const startTime = performance.now();
      const callerInfo = getCallerInfo(filename);
      let hasLogged = false;

      const isTrigger = method === "trigger";
      const data: NotificationData = isTrigger
        ? { method, channel: args[0], event: args[1], payload: args[2] }
        : { method, batch: args[0] };

      const callback = isTrigger ? args[4] : args[1];

      const logResult = (error: any) => {
        if (hasLogged) return;
        hasLogged = true;

        log({
          metadata: {
            package: "pusher",
            duration: parseFloat((performance.now() - startTime).toFixed(2)),
            location: { file: callerInfo.file, line: callerInfo.line },
            created_at: timestamp(),
          },
          data,
          error: error
            ? { name: error.name || "Error", message: error.message }
            : undefined,
        });
      };

      const wrappedCallback = (err: any, res: any) => {
        logResult(err);
        if (typeof callback === "function") callback(err, res);
      };

      // Validation
      if (isTrigger && (!args[0] || String(args[0]).trim() === "")) {
        const error = new Error(
          "Invalid channel name: Channel cannot be empty",
        );
        logResult(error);
        if (typeof callback === "function") {
          callback(error, null);
          return null;
        }
        throw error;
      }

      if (!isTrigger && (!Array.isArray(args[0]) || args[0].length === 0)) {
        const error = new Error("Invalid batch: Batch cannot be empty");
        logResult(error);
        if (typeof callback === "function") {
          callback(error, null);
          return null;
        }
        throw error;
      }

      try {
        const callArgs = isTrigger
          ? [args[0], args[1], args[2], args[3], wrappedCallback]
          : [args[0], wrappedCallback];

        const result = original.apply(this, callArgs);

        if (result?.then) {
          return result
            .then((res: any) => {
              if (!hasLogged) logResult(null);
              return res;
            })
            .catch((err: any) => {
              if (!hasLogged) logResult(err);
              throw err;
            });
        }

        return result;
      } catch (error: any) {
        if (!hasLogged) logResult(error);
        throw error;
      }
    };
  };
}

export function patchPusherExports(exports: any, filename: string): any {
  if (!exports?.prototype) return exports;

  if (typeof exports.prototype.trigger === "function") {
    shimmer.wrap(
      exports.prototype,
      "trigger",
      createHandler("trigger", filename),
    );
  }

  if (typeof exports.prototype.triggerBatch === "function") {
    shimmer.wrap(
      exports.prototype,
      "triggerBatch",
      createHandler("triggerBatch", filename),
    );
  }

  return exports;
}
