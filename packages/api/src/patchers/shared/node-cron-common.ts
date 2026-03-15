/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { v4 as uuidv4 } from "uuid";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

const METHODS = ["validate", "getTasks"] as const;

function log(entry: ScheduleContent) {
  watchers.scheduler.insertRedisStream({ ...entry });
}

export function patchNodeCronExports(exports: any, filename: string): any {
  if (typeof exports?.schedule !== "function") return exports;

  shimmer.wrap(
    exports,
    "schedule",
    (originalSchedule: Function) =>
      function patchedSchedule(
        this: any,
        cronExpression: string,
        task: Function,
        options?: any,
      ) {
        const scheduleId = uuidv4();
        const callerInfo = getCallerInfo(filename);

        log({
          metadata: {
            package: "node-cron",
            duration: 0,
            location: { file: callerInfo.file, line: callerInfo.line },
            created_at: timestamp(),
          },
          data: {
            type: "schedule",
            scheduleId,
            cronExpression,
          },
        });

        const wrappedTask = function (this: any, ...args: any[]) {
          const jobId = uuidv4();
          const startTime = performance.now();

          try {
            const result = task.apply(this, args);

            log({
              metadata: {
                package: "node-cron",
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
                cronExpression,
              },
            });

            return result;
          } catch (error: any) {
            log({
              metadata: {
                package: "node-cron",
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
                cronExpression,
              },
              error: {
                name: "NodeCronError",
                message: error?.message ?? String(error),
                stack: error?.stack,
              },
            });

            throw error;
          }
        };

        const scheduledTask = originalSchedule.call(
          this,
          cronExpression,
          wrappedTask,
          options,
        );

        if (scheduledTask?.stop) {
          shimmer.wrap(
            scheduledTask,
            "stop",
            (originalStop: Function) =>
              function patchedStop(this: any, ...args: any[]) {
                log({
                  metadata: {
                    package: "node-cron",
                    duration: 0,
                    location: { file: callerInfo.file, line: callerInfo.line },
                    created_at: timestamp(),
                  },
                  data: {
                    type: "stop",
                    scheduleId,
                    cronExpression,
                  },
                });

                return originalStop.apply(this, args);
              },
          );
        }

        return scheduledTask;
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
              package: "node-cron",
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
