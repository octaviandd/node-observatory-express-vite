/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { v4 as uuidv4 } from "uuid";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

const INSTANCE_METHODS = ["add", "start", "stop", "remove"] as const;
const JOB_METHODS = ["run", "stop", "remove"] as const;

function log(entry: ScheduleContent) {
  watchers.scheduler.insertRedisStream({ ...entry });
}

function patchJobMethods(
  job: any,
  jobName: string,
  breeId: string,
  scheduleId: string,
  filename: string,
) {
  for (const method of JOB_METHODS) {
    if (typeof job[method] !== "function") continue;

    shimmer.wrap(
      job,
      method,
      (originalMethod: Function) =>
        function patchedJobMethod(this: any, ...args: any[]) {
          const callerInfo = getCallerInfo(filename);
          const jobId = uuidv4();
          const startTime = performance.now();

          try {
            const result = originalMethod.apply(this, args);

            if (result?.then) {
              return result
                .then((value: any) => {
                  log({
                    metadata: {
                      package: "bree",
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
                      type: `job:${method}`,
                      scheduleId,
                      jobId,
                      breeId,
                      jobName,
                    },
                  });
                  return value;
                })
                .catch((error: any) => {
                  log({
                    metadata: {
                      package: "bree",
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
                      type: `job:${method}`,
                      scheduleId,
                      jobId,
                      breeId,
                      jobName,
                    },
                    error: {
                      name: "BreeError",
                      message: error?.message ?? String(error),
                      stack: error?.stack,
                    },
                  });
                  throw error;
                });
            }

            log({
              metadata: {
                package: "bree",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: {
                type: `job:${method}`,
                scheduleId,
                jobId,
                breeId,
                jobName,
              },
            });

            return result;
          } catch (error: any) {
            log({
              metadata: {
                package: "bree",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: {
                type: `job:${method}`,
                scheduleId,
                jobId,
                breeId,
                jobName,
              },
              error: {
                name: "BreeError",
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

export function patchBreeExports(exports: any, filename: string): any {
  shimmer.wrap(
    exports,
    "default",
    (originalConstructor: any) =>
      function patchedConstructor(this: any, ...args: any[]) {
        const callerInfo = getCallerInfo(filename);
        const breeInstance = new originalConstructor(...args);
        const breeId = uuidv4();
        breeInstance._observerId = breeId;

        log({
          metadata: {
            package: "bree",
            duration: 0,
            location: { file: callerInfo.file, line: callerInfo.line },
            created_at: timestamp(),
          },
          data: {
            type: "create",
            scheduleId: breeId,
            breeId,
            jobName: "init",
          },
        });

        return breeInstance;
      },
  );

  for (const method of INSTANCE_METHODS) {
    shimmer.wrap(
      exports.prototype,
      method,
      (originalFn) =>
        function patchedMethod(this: any, ...args: any[]) {
          const callerInfo = getCallerInfo(filename);
          const breeId = this._observerId || uuidv4();
          const scheduleId = uuidv4();

          let jobName = "";
          if (method === "add") {
            jobName =
              typeof args[0] === "string"
                ? args[0]
                : args[0]?.name || "unnamed";
          } else {
            jobName =
              typeof args[0] === "string"
                ? args[0]
                : Array.isArray(args[0])
                  ? args[0].join(",")
                  : args[0] === undefined
                    ? "all"
                    : "";
          }

          try {
            const result = originalFn.apply(this, args);

            if (result?.then) {
              return result
                .then((value: any) => {
                  log({
                    metadata: {
                      package: "bree",
                      duration: 0,
                      location: {
                        file: callerInfo.file,
                        line: callerInfo.line,
                      },
                      created_at: timestamp(),
                    },
                    data: { type: method, scheduleId, breeId, jobName },
                  });
                  return value;
                })
                .catch((error: any) => {
                  log({
                    metadata: {
                      package: "bree",
                      duration: 0,
                      location: {
                        file: callerInfo.file,
                        line: callerInfo.line,
                      },
                      created_at: timestamp(),
                    },
                    data: { type: method, scheduleId, breeId, jobName },
                    error: {
                      name: "BreeError",
                      message: error?.message ?? String(error),
                      stack: error?.stack,
                    },
                  });
                  throw error;
                });
            }

            if (method === "add" && result && this.config?.jobs) {
              const addedJob = this.config.jobs.find(
                (job: any) => job.name === jobName,
              );
              if (addedJob)
                patchJobMethods(
                  addedJob,
                  jobName,
                  breeId,
                  scheduleId,
                  filename,
                );
            }

            log({
              metadata: {
                package: "bree",
                duration: 0,
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: { type: method, scheduleId, breeId, jobName },
            });

            return result;
          } catch (error: any) {
            log({
              metadata: {
                package: "bree",
                duration: 0,
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: { type: method, scheduleId, breeId, jobName },
              error: {
                name: "BreeError",
                message: error?.message ?? String(error),
                stack: error?.stack,
              },
            });
            throw error;
          }
        },
    );
  }

  if (exports.prototype.init) {
    const originalInit = exports.prototype.init;

    exports.prototype.init = function patchedInit(this: any, ...args: any[]) {
      const callerInfo = getCallerInfo(filename);
      const result = originalInit.apply(this, args);

      if (this.workers && typeof this.on === "function") {
        const breeId = this._observerId || uuidv4();

        this.on("worker started", (name: string) => {
          if (!this._observerJobTimes) this._observerJobTimes = {};
          this._observerJobTimes[name] = {
            jobId: uuidv4(),
            startTime: performance.now(),
          };
        });

        this.on("worker completed", (name: string) => {
          const jobInfo = this._observerJobTimes?.[name] || {
            jobId: uuidv4(),
            startTime: performance.now(),
          };

          log({
            metadata: {
              package: "bree",
              duration: parseFloat(
                (performance.now() - jobInfo.startTime).toFixed(2),
              ),
              location: { file: callerInfo.file, line: callerInfo.line },
              created_at: timestamp(),
            },
            data: {
              type: "worker",
              scheduleId: jobInfo.jobId,
              jobId: jobInfo.jobId,
              breeId,
              jobName: name,
            },
          });

          delete this._observerJobTimes?.[name];
        });

        this.on("worker errored", (error: any, name: string) => {
          const jobInfo = this._observerJobTimes?.[name] || {
            jobId: uuidv4(),
            startTime: performance.now(),
          };

          log({
            metadata: {
              package: "bree",
              duration: parseFloat(
                (performance.now() - jobInfo.startTime).toFixed(2),
              ),
              location: { file: callerInfo.file, line: callerInfo.line },
              created_at: timestamp(),
            },
            data: {
              type: "worker",
              scheduleId: jobInfo.jobId,
              jobId: jobInfo.jobId,
              breeId,
              jobName: name,
            },
            error: {
              name: "BreeError",
              message: error?.message ?? String(error),
              stack: error?.stack,
            },
          });

          delete this._observerJobTimes?.[name];
        });
      }

      return result;
    };
  }

  return exports;
}
