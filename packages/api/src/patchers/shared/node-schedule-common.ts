/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { v4 as uuidv4 } from "uuid";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

const METHODS = ["rescheduleJob", "cancelJob", "cancelNext"] as const;

function log(entry: ScheduleContent) {
  watchers.scheduler.insertRedisStream({ ...entry });
}

export function patchNodeScheduleExports(exports: any, filename: string): any {
  if (typeof exports?.scheduleJob !== "function") return exports;

  shimmer.wrap(
    exports,
    "scheduleJob",
    (originalScheduleJob: Function) =>
      function patchedScheduleJob(
        this: any,
        name: string | null,
        rule: any,
        task: Function,
      ) {
        const scheduleId = uuidv4();
        const callerInfo = getCallerInfo(filename);

        log({
          metadata: {
            package: "node-schedule",
            duration: 0,
            location: { file: callerInfo.file, line: callerInfo.line },
            created_at: timestamp(),
          },
          data: {
            type: "schedule",
            scheduleId,
            name,
            rule,
          },
        });

        const wrappedTask = function (this: any, ...args: any[]) {
          const jobId = uuidv4();
          const startTime = performance.now();

          try {
            const result = task.apply(this, args);

            log({
              metadata: {
                package: "node-schedule",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: {
                type: "job",
                scheduleId,
                jobId,
                name,
              },
            });

            return result;
          } catch (error: any) {
            log({
              metadata: {
                package: "node-schedule",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: {
                type: "job",
                scheduleId,
                jobId,
                name,
              },
              error: {
                name: "NodeScheduleError",
                message: error?.message ?? String(error),
                stack: error?.stack,
              },
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
              (originalCancel: Function) =>
                function patchedCancel(this: any, ...args: any[]) {
                  log({
                    metadata: {
                      package: "node-schedule",
                      duration: 0,
                      location: {
                        file: callerInfo.file,
                        line: callerInfo.line,
                      },
                      created_at: timestamp(),
                    },
                    data: {
                      type: "cancel",
                      scheduleId,
                      name: job.name,
                    },
                  });

                  return originalCancel.apply(this, args);
                },
            );
          }

          if (typeof job.reschedule === "function") {
            shimmer.wrap(
              job,
              "reschedule",
              (originalReschedule: Function) =>
                function patchedReschedule(
                  this: any,
                  spec: any,
                  ...args: any[]
                ) {
                  log({
                    metadata: {
                      package: "node-schedule",
                      duration: 0,
                      location: {
                        file: callerInfo.file,
                        line: callerInfo.line,
                      },
                      created_at: timestamp(),
                    },
                    data: {
                      type: "reschedule",
                      scheduleId,
                      name: job.name,
                      rule: spec,
                    },
                  });

                  return originalReschedule.apply(this, [spec, ...args]);
                },
            );
          }
        }

        return job;
      },
  );

  for (const method of METHODS) {
    if (typeof exports[method] !== "function") continue;

    shimmer.wrap(
      exports,
      method,
      (originalFn: Function) =>
        function patchedMethod(this: any, ...args: any[]) {
          const callerInfo = getCallerInfo(filename);

          log({
            metadata: {
              package: "node-schedule",
              duration: 0,
              location: { file: callerInfo.file, line: callerInfo.line },
              created_at: timestamp(),
            },
            data: {
              type: method,
              scheduleId: uuidv4(),
            },
          });

          return originalFn.apply(this, args);
        },
    );
  }

  return exports;
}
