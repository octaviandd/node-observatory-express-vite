/** @format */

import { addHook, Namespace } from "import-in-the-middle";
import shimmer from "shimmer";
import { watchers, patchedGlobal } from "../../core/index.js";
import { v4 as uuidv4 } from "uuid";
import { getCallerInfo } from "../../core/helpers/helpers.js";

const NODESCHEDULE_PATCHED_SYMBOL = Symbol.for(
  "node-observer:nodeschedule-patched",
);

const METHODS = ["scheduleJob", "rescheduleJob", "cancelJob", "cancelNext"];

if (
  process.env.NODE_OBSERVATORY_SCHEDULER &&
  JSON.parse(process.env.NODE_OBSERVATORY_SCHEDULER).includes("node-schedule")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODESCHEDULE_PATCHED_SYMBOL]) {
    patchedGlobal[NODESCHEDULE_PATCHED_SYMBOL] = true;

    addHook((exports: any, name: Namespace, baseDir?: string) => {
      // Only patch 'node-schedule' module
      // if (name !== 'node-schedule') {
      //   return exports;
      // }

      // Handle both default and named exports
      const nodeScheduleModule = exports.default || exports;

      shimmer.wrap(
        nodeScheduleModule,
        "scheduleJob",
        function (originalScheduleJob: Function) {
          return function patchedScheduleJob(
            this: any,
            name: string | null,
            rule: any,
            task: Function,
          ) {
            const scheduleId = uuidv4();
            const callerInfo = getCallerInfo(__filename);
            watchers.scheduler.insertRedisStream({
              type: "set",
              package: "node-schedule",
              name,
              rule,
              scheduleId,
              file: callerInfo.file,
              line: callerInfo.line,
            });

            // Wrap the task to log execution time and handle errors
            const wrappedTask = function (this: any, ...args: any[]) {
              const jobId = uuidv4();
              const startTime = performance.now();
              watchers.scheduler.insertRedisStream({
                type: "run",
                package: "node-schedule",
                name,
                args,
                scheduleId,
                jobId,
              });

              try {
                const result = task.apply(this, args);

                const endTime = performance.now();
                const duration = parseFloat((endTime - startTime).toFixed(2));
                watchers.scheduler.insertRedisStream({
                  type: "processJob",
                  status: "completed",
                  package: "node-schedule",
                  name,
                  duration,
                  scheduleId,
                  jobId,
                  file: callerInfo.file,
                  line: callerInfo.line,
                });

                return result;
              } catch (error: any) {
                const endTime = performance.now();
                const duration = parseFloat((endTime - startTime).toFixed(2));
                watchers.scheduler.insertRedisStream({
                  type: "processJob",
                  status: "failed",
                  package: "node-schedule",
                  name,
                  duration,
                  scheduleId,
                  jobId,
                  error: error instanceof Error ? error.message : String(error),
                  file: callerInfo.file,
                  line: callerInfo.line,
                });

                throw error;
              }
            };

            const job = originalScheduleJob.call(this, name, rule, wrappedTask);

            if (job) {
              if (typeof job.cancel === "function") {
                shimmer.wrap(
                  job,
                  "cancel",
                  function (originalCancel: Function) {
                    return function patchedCancel(this: any, ...args: any[]) {
                      const callerInfo = getCallerInfo(__filename);
                      watchers.scheduler.insertRedisStream({
                        type: "cancel",
                        package: "node-schedule",
                        name: job.name,
                        scheduleId,
                        file: callerInfo.file,
                        line: callerInfo.line,
                      });

                      return originalCancel.apply(this, args);
                    };
                  },
                );
              }

              // Patch reschedule method
              if (typeof job.reschedule === "function") {
                shimmer.wrap(
                  job,
                  "reschedule",
                  function (originalReschedule: Function) {
                    return function patchedReschedule(
                      this: any,
                      spec: any,
                      ...args: any[]
                    ) {
                      const callerInfo = getCallerInfo(__filename);
                      watchers.scheduler.insertRedisStream({
                        type: "reschedule",
                        package: "node-schedule",
                        name: job.name,
                        newRule: spec,
                        scheduleId,
                        file: callerInfo.file,
                        line: callerInfo.line,
                      });

                      return originalReschedule.apply(this, [spec, ...args]);
                    };
                  },
                );
              }

              // Patch nextInvocation method
              if (typeof job.nextInvocation === "function") {
                shimmer.wrap(
                  job,
                  "nextInvocation",
                  function (originalNextInvocation: Function) {
                    return function patchedNextInvocation(
                      this: any,
                      ...args: any[]
                    ) {
                      const result = originalNextInvocation.apply(this, args);

                      const callerInfo = getCallerInfo(__filename);
                      watchers.scheduler.insertRedisStream({
                        type: "nextInvocation",
                        package: "node-schedule",
                        name: job.name,
                        nextInvocation: result ? result.toISOString() : null,
                        scheduleId,
                        file: callerInfo.file,
                        line: callerInfo.line,
                      });

                      return result;
                    };
                  },
                );
              }
            }

            return job;
          };
        },
      );

      // Patch other methods for logging
      METHODS.forEach((method) => {
        if (
          method !== "scheduleJob" &&
          typeof nodeScheduleModule[method] === "function"
        ) {
          shimmer.wrap(nodeScheduleModule, method, function (originalFn: Function) {
            return function patchedMethod(this: any, ...args: any[]) {
              const callerInfo = getCallerInfo(__filename);
              watchers.scheduler.insertRedisStream({
                type: method,
                package: "node-schedule",
                data: args,
                file: callerInfo.file,
                line: callerInfo.line,
              });

              return originalFn.apply(this, args);
            };
          });
        }
      });

      return exports;
    });
  }
}
