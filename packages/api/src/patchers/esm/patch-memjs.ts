/** @format */

import { addHook, Namespace } from "import-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../../core/index.js";
import { getCallerInfo } from "../../core/helpers/helpers.js";

// Create a global symbol to track if memjs has been patched
const MEMJS_PATCHED_SYMBOL = Symbol.for("node-observer:memjs-patched");

if (
  process.env.NODE_OBSERVATORY_CACHE &&
  JSON.parse(process.env.NODE_OBSERVATORY_CACHE).includes("memjs")
) {
  // Check if memjs has already been patched
  if (!(global as any)[MEMJS_PATCHED_SYMBOL]) {
    // Mark memjs as patched
    (global as any)[MEMJS_PATCHED_SYMBOL] = true;

    const MEMJS_METHODS = {
      get: "get",
      set: "set",
      delete: "delete",
      replace: "replace",
      increment: "increment",
      decrement: "decrement",
    };

    /**
     * Hook "memjs" to patch its cache operations.
     */
    addHook((exports: any, name: Namespace, baseDir?: string) => {
      // Only patch 'memjs' module
      // if (name !== 'memjs') {
      //   return exports;
      // }

      // Handle both default and named exports
      const memjsModule = exports.default || exports;

      // `memjsModule` is the MemJS client module.
      if (!memjsModule || typeof memjsModule.Client !== "function") {
        return exports;
      }

      // Patch the prototype methods instead of individual instances
      Object.entries(MEMJS_METHODS).forEach(([method, displayName]) => {
        if (typeof memjsModule.Client.prototype[method] === "function") {
          shimmer.wrap(memjsModule.Client.prototype, method, function (original) {
            return async function patched(
              this: any,
              key: string,
              ...args: any[]
            ) {
              const callerInfo = getCallerInfo(__filename);

              const logContent: { [key: string]: any } = {
                type: method,
                package: "memjs",
                file: callerInfo.file,
                line: callerInfo.line,
                key,
              };

              const startTime = performance.now();

              try {
                // Group 1: READ operations that can result in hits/misses
                if (method === "get") {
                  const result = await original.call(this, key, ...args);
                  const endTime = performance.now();

                  if (result === undefined) {
                    return result;
                  }

                  // Track hit or miss
                  const isHit =
                    result &&
                    result.value !== undefined &&
                    result.value !== null;

                  logContent["hits"] = isHit ? 1 : 0;
                  logContent["misses"] = !isHit ? 1 : 0;
                  logContent["key"] = key;
                  if (isHit) {
                    logContent["value"] = result.value.toString("utf-8");
                  }

                  logContent["duration"] = parseFloat(
                    (endTime - startTime).toFixed(2),
                  );
                  watchers.cache.insertRedisStream(logContent);
                  return result;
                }
                // Group 2: WRITE operations
                else if (["set", "replace"].includes(method)) {
                  logContent["value"] = args[0];
                  if (args[1]) {
                    logContent["options"] = args[1];
                  }

                  const result = await original.call(this, key, ...args);
                  const endTime = performance.now();

                  logContent["writes"] = 1;
                  logContent["key"] = key;
                  logContent["duration"] = parseFloat(
                    (endTime - startTime).toFixed(2),
                  );
                  watchers.cache.insertRedisStream(logContent);
                  return result;
                }
                // Group 3: DELETE operations
                else if (method === "delete") {
                  const result = await original.call(this, key, ...args);
                  const endTime = performance.now();

                  if (result === undefined) {
                    return result;
                  }

                  logContent["writes"] = 1;
                  logContent["key"] = key;
                  logContent["duration"] = parseFloat(
                    (endTime - startTime).toFixed(2),
                  );
                  watchers.cache.insertRedisStream(logContent);
                  return result;
                }
                // Group 4: INCREMENT/DECREMENT operations
                else if (["increment", "decrement"].includes(method)) {
                  const result = await original.call(this, key, ...args);
                  const endTime = performance.now();

                  if (result === undefined) {
                    return result;
                  }

                  logContent["writes"] = 1;
                  logContent["key"] = key;
                  logContent["value"] = result.value;
                  logContent["duration"] = parseFloat(
                    (endTime - startTime).toFixed(2),
                  );
                  watchers.cache.insertRedisStream(logContent);
                  return result;
                }
                // Fallback for any other methods
                else {
                  const result = await original.call(this, key, ...args);
                  const endTime = performance.now();

                  logContent["duration"] = parseFloat(
                    (endTime - startTime).toFixed(2),
                  );
                  watchers.cache.insertRedisStream(logContent);
                  return result;
                }
              } catch (error: unknown) {
                const endTime = performance.now();
                logContent["duration"] = parseFloat(
                  (endTime - startTime).toFixed(2),
                );
                logContent["error"] =
                  error instanceof Error ? error.message : String(error);
                logContent["stack"] =
                  error instanceof Error ? error.stack : String(error);
                watchers.cache.insertRedisStream(logContent);
                throw error;
              }
            };
          });
        }
      });
      return exports;
    });
  }
}
