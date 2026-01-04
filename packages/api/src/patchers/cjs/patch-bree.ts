/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers, patchedGlobal } from "../../core/index";
import { v4 as uuidv4 } from "uuid";
import { getCallerInfo } from "../../core/helpers/helpers";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";

const instanceMethods = ["add", "start", "stop", "remove"];
const jobMethods = ["run", "stop", "remove"];

if (
  process.env.NODE_OBSERVATORY_SCHEDULER &&
  JSON.parse(process.env.NODE_OBSERVATORY_SCHEDULER).includes("bree")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.BREE_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.BREE_PATCHED_SYMBOL] = true;

    new Hook(["bree"], (exports: any) => {
      shimmer.wrap(exports, "default", function (originalConstructor: any) {
        return function patchedConstructor(this: any, ...args: any[]) {
          const callerInfo = getCallerInfo(__filename);
          const breeInstance = new originalConstructor(...args);

          const breeId = uuidv4();
          breeInstance._observerId = breeId;

          watchers.scheduler.insertRedisStream({
            type: "create",
            package: "bree",
            breeId,
            config: args[0] || {},
            file: callerInfo.file,
            line: callerInfo.line,
            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
          });

          return breeInstance;
        };
      });

      instanceMethods.forEach((method) => {
        shimmer.wrap(exports.prototype, method, function (originalFn) {
          return function patchedMethod(this: any, ...args: any[]) {
            const callerInfo = getCallerInfo(__filename);
            const breeId = this._observerId || uuidv4();
            const scheduleId = uuidv4();

            let jobName = "";
            let jobConfig = {};

            if (method === "add" && args.length > 0) {
              // The add method can take a job name or a job config object
              if (typeof args[0] === "string") {
                jobName = args[0];
              } else if (typeof args[0] === "object") {
                jobConfig = args[0];
                jobName = args[0].name || "unnamed";
              }
            } else if (
              method === "start" ||
              method === "stop" ||
              method === "remove"
            ) {
              // These methods can take a job name as the first argument
              if (typeof args[0] === "string") {
                jobName = args[0];
              } else if (Array.isArray(args[0])) {
                jobName = args[0].join(",");
              } else if (args[0] === undefined) {
                jobName = "all";
              }
            }

            // Log the method call
            watchers.scheduler.insertRedisStream({
              type: method,
              package: "bree",
              breeId,
              scheduleId,
              jobName,
              arguments: args,
              file: callerInfo.file,
              line: callerInfo.line,
              created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
            });

            try {
              // Call the original method
              const result = originalFn.apply(this, args);

              // For methods that return a promise
              if (result && typeof result.then === "function") {
                return result
                  .then((value: any) => {
                    // Log successful completion
                    watchers.scheduler.insertRedisStream({
                      type: `${method}:completed`,
                      package: "bree",
                      breeId,
                      scheduleId,
                      jobName,
                      success: true,
                      file: callerInfo.file,
                      line: callerInfo.line,
                    });
                    return value;
                  })
                  .catch((error: any) => {
                    // Log failure
                    watchers.scheduler.insertRedisStream({
                      type: `${method}:failed`,
                      package: "bree",
                      breeId,
                      scheduleId,
                      jobName,
                      success: false,
                      error:
                        error instanceof Error ? error.message : String(error),
                      file: callerInfo.file,
                      line: callerInfo.line,
                      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
                    });
                    throw error;
                  });
              }

              // For methods that return a job or jobs
              if (method === "add" && result) {
                // The add method returns the job that was added
                // Patch methods on the job object if it exists
                if (this.config && this.config.jobs) {
                  const addedJob = this.config.jobs.find(
                    (job: any) => job.name === jobName,
                  );
                  if (addedJob) {
                    patchJobMethods(addedJob, jobName, breeId, scheduleId);
                  }
                }
              }

              // Log successful completion for synchronous methods
              watchers.scheduler.insertRedisStream({
                type: `${method}:completed`,
                package: "bree",
                breeId,
                scheduleId,
                jobName,
                success: true,
                file: callerInfo.file,
                line: callerInfo.line,
                created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
              });

              return result;
            } catch (error: any) {
              // Log failure for synchronous methods
              watchers.scheduler.insertRedisStream({
                type: `${method}:failed`,
                package: "bree",
                breeId,
                scheduleId,
                jobName,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                file: callerInfo.file,
                line: callerInfo.line,
                created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
              });
              throw error;
            }
          };
        });
      });

      // Helper function to patch methods on individual job objects
      function patchJobMethods(
        job: any,
        jobName: string,
        breeId: string,
        scheduleId: string,
      ) {
        jobMethods.forEach((method) => {
          if (job[method] && typeof job[method] === "function") {
            shimmer.wrap(job, method, function (originalMethod: Function) {
              return function patchedJobMethod(this: any, ...args: any[]) {
                const callerInfo = getCallerInfo(__filename);
                const jobId = uuidv4();
                const startTime = performance.now();

                // Log the job method call
                watchers.scheduler.insertRedisStream({
                  type: `job:${method}`,
                  package: "bree",
                  breeId,
                  scheduleId,
                  jobId,
                  jobName,
                  file: callerInfo.file,
                  line: callerInfo.line,
                  created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
                });

                try {
                  const startTime = performance.now();
                  const result = originalMethod.apply(this, args);

                  // For methods that return a promise
                  if (result && typeof result.then === "function") {
                    return result
                      .then((value: any) => {
                        const endTime = performance.now();
                        const duration = parseFloat(
                          (endTime - startTime).toFixed(2),
                        );

                        // Log successful completion
                        watchers.scheduler.insertRedisStream({
                          type: `job:${method}:completed`,
                          package: "bree",
                          breeId,
                          scheduleId,
                          jobId,
                          jobName,
                          duration,
                          success: true,
                          file: callerInfo.file,
                          line: callerInfo.line,
                          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
                        });
                        return value;
                      })
                      .catch((error: any) => {
                        const endTime = performance.now();
                        const duration = parseFloat(
                          (endTime - startTime).toFixed(2),
                        );

                        // Log failure
                        watchers.scheduler.insertRedisStream({
                          type: `job:${method}:failed`,
                          package: "bree",
                          breeId,
                          scheduleId,
                          jobId,
                          jobName,
                          duration,
                          success: false,
                          error:
                            error instanceof Error
                              ? error.message
                              : String(error),
                          file: callerInfo.file,
                          line: callerInfo.line,
                          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
                        });
                        throw error;
                      });
                  }

                  const endTime = performance.now();
                  const duration = parseFloat((endTime - startTime).toFixed(2));

                  // Log successful completion for synchronous methods
                  watchers.scheduler.insertRedisStream({
                    type: `job:${method}:completed`,
                    package: "bree",
                    breeId,
                    scheduleId,
                    jobId,
                    jobName,
                    duration,
                    success: true,
                    file: callerInfo.file,
                    line: callerInfo.line,
                    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
                  });

                  return result;
                } catch (error: any) {
                  const endTime = performance.now();
                  const duration = parseFloat((endTime - startTime).toFixed(2));

                  // Log failure for synchronous methods
                  watchers.scheduler.insertRedisStream({
                    type: `job:${method}:failed`,
                    package: "bree",
                    breeId,
                    scheduleId,
                    jobId,
                    jobName,
                    duration,
                    success: false,
                    error:
                      error instanceof Error ? error.message : String(error),
                    file: callerInfo.file,
                    line: callerInfo.line,
                    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
                  });
                  throw error;
                }
              };
            });
          }
        });
      }

      // Also patch the worker event handlers to track job execution
      if (exports.prototype.init) {
        const originalInit = exports.prototype.init;
        exports.prototype.init = function patchedInit(
          this: any,
          ...args: any[]
        ) {
          const callerInfo = getCallerInfo(__filename);
          const result = originalInit.apply(this, args);

          // After initialization, patch the event handlers for workers
          if (this.workers && typeof this.on === "function") {
            const breeId = this._observerId || uuidv4();

            // Track worker creation
            this.on("worker created", (name: string) => {
              const jobId = uuidv4();
              watchers.scheduler.insertRedisStream({
                type: "worker:created",
                package: "bree",
                breeId,
                jobId,
                jobName: name,
                file: callerInfo.file,
                line: callerInfo.line,
                created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
              });
            });

            // Track worker start
            this.on("worker started", (name: string) => {
              const jobId = uuidv4();
              const startTime = performance.now();

              // Store the start time for this job
              if (!this._observerJobTimes) this._observerJobTimes = {};
              this._observerJobTimes[name] = { jobId, startTime };

              watchers.scheduler.insertRedisStream({
                type: "worker:started",
                package: "bree",
                breeId,
                jobId,
                jobName: name,
                file: callerInfo.file,
                line: callerInfo.line,
                created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
              });
            });

            // Track worker completion
            this.on("worker completed", (name: string) => {
              // Get the stored job info
              if (!this._observerJobTimes) this._observerJobTimes = {};
              const jobInfo = this._observerJobTimes[name] || {
                jobId: uuidv4(),
                startTime: performance.now(),
              };

              const endTime = performance.now();
              const duration = parseFloat(
                (endTime - jobInfo.startTime).toFixed(2),
              );

              watchers.scheduler.insertRedisStream({
                type: "worker:completed",
                package: "bree",
                breeId,
                jobId: jobInfo.jobId,
                jobName: name,
                duration,
                success: true,
                file: callerInfo.file,
                line: callerInfo.line,
                created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
              });

              // Clean up
              delete this._observerJobTimes[name];
            });

            // Track worker errors
            this.on("worker errored", (error: any, name: string) => {
              // Get the stored job info
              if (!this._observerJobTimes) this._observerJobTimes = {};
              const jobInfo = this._observerJobTimes[name] || {
                jobId: uuidv4(),
                startTime: performance.now(),
              };

              const endTime = performance.now();
              const duration = parseFloat(
                (endTime - jobInfo.startTime).toFixed(2),
              );

              watchers.scheduler.insertRedisStream({
                type: "worker:errored",
                package: "bree",
                breeId,
                jobId: jobInfo.jobId,
                jobName: name,
                duration,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                file: callerInfo.file,
                line: callerInfo.line,
                created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
              });

              // Clean up
              delete this._observerJobTimes[name];
            });
          }

          return result;
        };
      }
      return exports;
    });
  }
}
