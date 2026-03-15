/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

const METHODS = ["put", "del", "get"] as const;

function log(entry: CacheContent) {
  watchers.cache.insertRedisStream({ ...entry });
}

export function patchLevelExports(exports: any, filename: string): any {
  if (!exports?.Level || typeof exports.Level !== "function") return exports;

  shimmer.wrap(
    exports,
    "Level",
    (originalLevel) =>
      function patchedLevel(this: any, location: string, options?: any) {
        const db = new originalLevel(location, options);

        for (const method of METHODS) {
          if (typeof db[method] !== "function") continue;

          shimmer.wrap(
            db,
            method,
            (originalMethod) =>
              async function patchedMethod(this: any, ...args: any[]) {
                const callerInfo = getCallerInfo(filename);
                const startTime = performance.now();

                if (method === "get") {
                  try {
                    const result = await originalMethod.apply(this, args);
                    const isHit =
                      result !== undefined &&
                      result !== null &&
                      result !== false;

                    log({
                      metadata: {
                        package: "level",
                        duration: parseFloat(
                          (performance.now() - startTime).toFixed(2),
                        ),
                        location: {
                          file: callerInfo.file,
                          line: callerInfo.line,
                        },
                        created_at: timestamp(),
                      },
                      data: {
                        key: args[0],
                        method,
                        status: "completed",
                        hits: isHit ? 1 : 0,
                        misses: isHit ? 0 : 1,
                      },
                    });

                    return result;
                  } catch (error: any) {
                    if (error.code === "LEVEL_NOT_FOUND") {
                      log({
                        metadata: {
                          package: "level",
                          duration: parseFloat(
                            (performance.now() - startTime).toFixed(2),
                          ),
                          location: {
                            file: callerInfo.file,
                            line: callerInfo.line,
                          },
                          created_at: timestamp(),
                        },
                        data: {
                          key: args[0],
                          method,
                          status: "completed",
                          hits: 0,
                          misses: 1,
                        },
                      });
                    } else {
                      log({
                        metadata: {
                          package: "level",
                          duration: parseFloat(
                            (performance.now() - startTime).toFixed(2),
                          ),
                          location: {
                            file: callerInfo.file,
                            line: callerInfo.line,
                          },
                          created_at: timestamp(),
                        },
                        data: { key: args[0], method, status: "failed" },
                        error: {
                          name: "LevelError",
                          message: error.message,
                          stack: error.stack,
                        },
                      });
                    }

                    throw error;
                  }
                }

                try {
                  const result = await originalMethod.apply(this, args);

                  log({
                    metadata: {
                      package: "level",
                      duration: parseFloat(
                        (performance.now() - startTime).toFixed(2),
                      ),
                      location: {
                        file: callerInfo.file,
                        line: callerInfo.line,
                      },
                      created_at: timestamp(),
                    },
                    data: {
                      key: args[0],
                      method,
                      status: "completed",
                      writes: 1,
                    },
                  });

                  return result;
                } catch (error: any) {
                  log({
                    metadata: {
                      package: "level",
                      duration: parseFloat(
                        (performance.now() - startTime).toFixed(2),
                      ),
                      location: {
                        file: callerInfo.file,
                        line: callerInfo.line,
                      },
                      created_at: timestamp(),
                    },
                    data: { key: args[0], method, status: "failed" },
                    error: {
                      name: "LevelError",
                      message: error?.message ?? String(error),
                      stack: error?.stack,
                    },
                  });

                  throw error;
                }
              },
          );
        }

        return db;
      },
  );

  return exports;
}
