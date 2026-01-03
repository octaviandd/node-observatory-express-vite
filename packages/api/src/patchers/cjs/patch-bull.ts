/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers, patchedGlobal } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";
import { v4 as uuidv4 } from "uuid";
import { jobLocalStorage } from "../../core/store";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";

if (
  process.env.NODE_OBSERVATORY_JOBS &&
  JSON.parse(process.env.NODE_OBSERVATORY_JOBS).includes("bull")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.BULL_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.BULL_PATCHED_SYMBOL] = true;

    const METHODS_TO_PATCH = {
      process: "process",
      add: "add",
      retryJob: "retryJob",
      start: "start",
      pause: "pause",
      resume: "resume",
      processJob: "processJob",
    };

    new Hook(["bull"], (exports: any) => {
      const BullQueueProto = exports.prototype;

      Object.entries(METHODS_TO_PATCH).forEach(([methodName, displayName]) => {
        if (typeof BullQueueProto[methodName] === "function") {
          shimmer.wrap(BullQueueProto, methodName, (originalFn) => {
            return async function patchedBullMethod(this: any, ...args: any[]) {
              const callerInfo = getCallerInfo(__filename);
              let jobId = uuidv4();

              // Execute the function in jobLocalStorage context and capture its result
              const result = await jobLocalStorage.run(new Map(), async () => {
                jobLocalStorage.getStore().set("jobId", jobId);
                const redisOptions =
                  this.queue?.client?.options || this.client?.options;
                const connectionName = redisOptions?.host
                  ? `${redisOptions.host}:${redisOptions.port}`
                  : "default";

                const createdAt = Date.now();

                let fnResult;
                let didFail = false;
                let failReason;
                let attemptStartTime;

                if (methodName === "add") {
                  const jobData = args[1] || args[0]; // The data might be the second argument
                  watchers.jobs.insertRedisStream(
                    {
                      status: "started",
                      method: displayName,
                      queue: this.queue?.name || this.name,
                      connectionName,
                      jobData,
                      token: this.token,
                      file: callerInfo.file,
                      line: callerInfo.line,
                      package: "bull",
                      createdAt,
                    },
                  );
                }

                if (methodName === "processJob" && args[0]) {
                  attemptStartTime = performance.now();

                  const job = args[0];
                  watchers.jobs.insertRedisStream(
                    {
                      status: "processing",
                      method: displayName,
                      queue: this.queue?.name || this.name,
                      attemptsMade: job.attemptsMade,
                      connectionName,
                      jobId: job.id,
                      token: this.token,
                      file: callerInfo.file,
                      line: callerInfo.line,
                      package: "bull",
                      createdAt,
                    },
                  );
                }

                try {
                  fnResult = await originalFn.apply(this, args);
                } catch (err: any) {
                  // this doesnt really work, the job failing seems to not trigger an error thrown.
                  didFail = true;
                  failReason = err?.message || err;
                  throw err;
                } finally {
                  if (methodName === "processJob" && args[0]) {
                    const job = args[0];
                    const {
                      processedOn,
                      finishedOn,
                      failedReason,
                      returnvalue,
                      attemptsMade,
                      opts,
                    } = job;

                    let duration =
                      processedOn && finishedOn
                        ? parseFloat((finishedOn - processedOn).toFixed(2))
                        : null;

                    const attemptEndTime = performance.now();
                    const attemptDuration = attemptStartTime
                      ? attemptEndTime - attemptStartTime
                      : null;

                    if (!finishedOn) {
                      duration = attemptDuration
                        ? parseFloat(attemptDuration.toFixed(2))
                        : null;
                    }

                    // The last failedReason persists even when the job eventually succeeds. failedReason is actually the last failedReason.
                    // finishedOn doesn't refer to the actual job but the last attempt.
                    // finishedOn doesn't necessarely indicate that the job was completed but rather that all attempts have been made.

                    if (failedReason && returnvalue === null) {
                      watchers.jobs.insertRedisStream(
                        {
                          status: "failed",
                          method: displayName,
                          queue: this.queue?.name || this.name,
                          connectionName,
                          jobId: job.id,
                          token: this.token,
                          file: callerInfo.file,
                          line: callerInfo.line,
                          duration,
                          failedReason,
                          attemptsMade,
                          package: "bull",
                          returnValue: returnvalue,
                          createdAt,
                        },
                      );

                      if (attemptsMade < opts.attempts && !finishedOn) {
                        watchers.jobs.insertRedisStream(
                          {
                            status: "released",
                            method: displayName,
                            queue: this.queue?.name || this.name,
                            connectionName,
                            jobId: job.id,
                            duration,
                            token: this.token,
                            file: callerInfo.file,
                            line: callerInfo.line,
                            attemptsMade,
                            package: "bull",
                            createdAt,
                          },
                        );
                      }
                    } else if (returnvalue !== null) {
                      watchers.jobs.insertRedisStream(
                        {
                          status: "completed",
                          method: displayName,
                          queue: this.queue?.name || this.name,
                          connectionName,
                          jobId: job.id,
                          token: this.token,
                          file: callerInfo.file,
                          line: callerInfo.line,
                          duration,
                          attemptsMade,
                          package: "bull",
                          returnValue: returnvalue,
                          createdAt,
                        },
                      );
                    }
                  }
                }

                return fnResult; // Return the result from this inner async function
              });

              // Return the result from the outer function
              return result;
            };
          });
        }
      });

      return exports;
    });
  }
}
