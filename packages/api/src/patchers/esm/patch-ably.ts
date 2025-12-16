/** @format */

import { addHook, Namespace } from 'import-in-the-middle';
import shimmer from 'shimmer';
import { watchers } from '../../../index.js';
import { getCallerInfo } from '../../../utils.js';

// Create a global symbol to track if ably has been patched
const ABLY_PATCHED_SYMBOL = Symbol.for('node-observer:ably-patched');

const channelMethodsToPatch = [
  'publish',
  // 'subscribe',
  // 'unsubscribe',
  // 'presence',
] as const;

const presenceMethodsToPatch = [
  'enter',
  'update',
  'leave',
  'get',
  'subscribe',
] as const;

const historyMethodsToPatch = ['history', 'presenceHistory'] as const;

if (
  process.env.NODE_OBSERVATORY_NOTIFICATIONS &&
  JSON.parse(process.env.NODE_OBSERVATORY_NOTIFICATIONS).includes('ably')
) {
  // Check if ably has already been patched
  if (!(global as any)[ABLY_PATCHED_SYMBOL]) {
    // Mark ably as patched
    (global as any)[ABLY_PATCHED_SYMBOL] = true;

    /**
     * Hook "ably" to patch its connection and event handling (ESM version).
     */
    addHook((exports: any, name: Namespace, baseDir?: string) => {
      // Only patch 'ably' module
      // if (name !== 'ably') {
      //   return exports;
      // }

      // Handle both default and named exports
      const ablyExports = exports.default || exports;

      if (
        !ablyExports ||
        (typeof ablyExports.Realtime !== 'function' &&
          typeof ablyExports.Rest !== 'function')
      ) {
        return exports;
      }

      // Patch the Realtime constructor
      if (typeof ablyExports.Realtime === 'function') {
        shimmer.wrap(ablyExports, 'Realtime', function (OriginalRealtime) {
          return function PatchedRealtime(this: any, options: any) {
            const realtime = new OriginalRealtime(options);

            if (
              realtime.channels &&
              typeof realtime.channels.get === 'function'
            ) {
              shimmer.wrap(realtime.channels, 'get', function (originalGet) {
                return function patchedGet(
                  this: any,
                  channelName: string,
                  channelOptions?: any,
                ) {
                  const channel =
                    arguments.length > 1
                      ? originalGet.call(this, channelName, channelOptions)
                      : originalGet.call(this, channelName);

                  patchObject(channel, channelMethodsToPatch, {
                    mode: 'realtime',
                    channel: channelName,
                  });

                  return channel;
                };
              });
            }

            return realtime;
          };
        });
      }

      // Patch the Rest constructor
      if (typeof ablyExports.Rest === 'function') {
        shimmer.wrap(ablyExports, 'Rest', function (OriginalRest) {
          return function PatchedRest(this: any, options: any) {
            const rest = new OriginalRest(options);

            if (rest.channels && typeof rest.channels.get === 'function') {
              shimmer.wrap(rest.channels, 'get', function (originalGet) {
                return function patchedGet(
                  this: any,
                  channelName: string,
                  channelOptions?: any,
                ) {
                  const channel =
                    arguments.length > 1
                      ? originalGet.call(this, channelName, channelOptions)
                      : originalGet.call(this, channelName);

                  patchObject(channel, channelMethodsToPatch, {
                    mode: 'rest',
                    channel: channelName,
                  });

                  return channel;
                };
              });
            }

            return rest;
          };
        });
      }

      // Return the modified exports
      // If original had default export, preserve that structure
      if (exports.default) {
        return {
          ...exports,
          default: ablyExports,
        };
      }

      return ablyExports;
    });
  }
}

function wrapMethod(original: Function, methodName: string, context: any = {}) {
  return async function wrapped(this: any, ...args: any[]) {
    const startTime = performance.now();
    const callerInfo = getCallerInfo(__filename);

    const logData: { [key: string]: any } = {
      package: 'ably',
      method: methodName,
      mode: context.mode || 'realtime',
      channel: context.channel,
      event: methodName === 'publish' && args.length > 0 ? args[0] : undefined,
      data: methodName === 'publish' && args.length > 1 ? args[1] : args[0],
      options: methodName === 'publish' && args.length > 2 ? args[2] : null,
      file: callerInfo.file,
      line: callerInfo.line,
    };

    try {
      const result = await original.apply(this, args);
      const endTime = performance.now();

      watchers.notifications.insertRedisStream({
        ...logData,
        status: 'completed',
        response: result,
        duration: parseFloat((endTime - startTime).toFixed(2)),
        error: null,
      });

      return result;
    } catch (error: any) {
      const endTime = performance.now();

      watchers.notifications.insertRedisStream({
        ...logData,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        response: null,
        duration: parseFloat((endTime - startTime).toFixed(2)),
      });

      throw error;
    }
  };
}

function patchObject(obj: any, methods: readonly string[], context: any = {}) {
  for (const method of methods) {
    if (typeof obj[method] === 'function' && !obj[`_${method}Patched`]) {
      shimmer.wrap(obj, method, function (original) {
        if (typeof original !== 'function') return original;
        return wrapMethod(original, method, context);
      });
      obj[`_${method}Patched`] = true;
    }
  }
}
