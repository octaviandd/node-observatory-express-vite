/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";
import { v4 as uuidv4 } from "uuid";
import { jobLocalStorage } from "../../core/store";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: JobContent) {
  watchers.jobs.insertRedisStream({ ...entry });
}

const METHODS_TO_PATCH = ["process", "add"] as const;

export function patchBullExports(exports: any, filename: string): any {
  if (!exports?.prototype) return exports;

  const BullQueueProto = exports.prototype;

  for (const method of METHODS_TO_PATCH) {
    if (typeof BullQueueProto[method] !== "function") continue;

    shimmer.wrap(
      BullQueueProto,
      method,
      (originalFn) =>
        async function patchedBullMethod(this: any, ...args: any[]) {
          const callerInfo = getCallerInfo(filename);
          const jobId = uuidv4();

          return jobLocalStorage.run(new Map(), async () => {
            jobLocalStorage.getStore()!.set("jobId", jobId);

            const redisOptions =
              this.client?.options || this.clients?.[0]?.options;
            const connectionName = redisOptions?.host
              ? `${redisOptions.host}:${redisOptions.port}`
              : "localhost:6379";

            const queueName = this.name || "unknown";

            // Handle queue.add() - job creation
            if (method === "add") {
              const startTime = performance.now();

              try {
                const result = await originalFn.apply(this, args);

                log({
                  metadata: {
                    package: "bull",
                    duration: parseFloat(
                      (performance.now() - startTime).toFixed(2),
                    ),
                    location: { file: callerInfo.file, line: callerInfo.line },
                    created_at: timestamp(),
                  },
                  data: {
                    method,
                    status: "completed",
                    queue: queueName,
                    connectionName,
                    jobId: result.id,
                  },
                });

                return result;
              } catch (err: any) {
                log({
                  metadata: {
                    package: "bull",
                    duration: parseFloat(
                      (performance.now() - startTime).toFixed(2),
                    ),
                    location: { file: callerInfo.file, line: callerInfo.line },
                    created_at: timestamp(),
                  },
                  data: {
                    method,
                    status: "failed",
                    queue: queueName,
                    connectionName,
                  },
                  error: {
                    name: err.name || "BullError",
                    message: err.message || String(err),
                    stack: err.stack,
                  },
                });

                throw err;
              }
            }

            // Handle queue.process() - wrap the user's processor to capture success/failure
            if (method === "process") {
              // Bull.process signatures:
              //   process(processor)
              //   process(name, processor)
              //   process(concurrency, processor)
              //   process(name, concurrency, processor)
              const processorIndex = args.findIndex(
                (a) => typeof a === "function",
              );
              if (processorIndex !== -1) {
                const originalProcessor = args[processorIndex];
                args[processorIndex] = async function wrappedBullProcessor(
                  job: any,
                ) {
                  // Snapshot before Bull mutates the job on retry
                  const attemptsMade = job.attemptsMade + 1;
                  const totalAttempts = job.opts?.attempts ?? 1;
                  const startTime = performance.now();
                  try {
                    const result = await originalProcessor(job);
                    log({
                      metadata: {
                        package: "bull",
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
                        method: "processJob",
                        status: "completed",
                        queue: queueName,
                        connectionName,
                        jobId: job.id,
                        attemptsMade,
                      },
                    });
                    return result;
                  } catch (err: any) {
                    // attemptsMade < totalAttempts means Bull will retry → released
                    const status =
                      attemptsMade < totalAttempts ? "released" : "failed";

                    log({
                      metadata: {
                        package: "bull",
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
                        method: "processJob",
                        status,
                        queue: queueName,
                        connectionName,
                        jobId: job.id,
                        attemptsMade,
                        failedReason: err.message,
                      },
                      error: {
                        name: err.name || "JobProcessingError",
                        message: err.message || String(err),
                        stack: err.stack,
                      },
                    });
                    throw err; // re-throw so Bull handles retries/moveToFailed
                  }
                };
              }
              return originalFn.apply(this, args);
            }

            // Fallback for other methods
            return originalFn.apply(this, args);
          });
        },
    );
  }

  return exports;
}
