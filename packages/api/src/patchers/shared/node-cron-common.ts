/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { v4 as uuidv4 } from "uuid";
import { getCallerInfo } from "../../core/helpers/helpers";

type NodeCronMetadata = { package: "node-cron"; type: string; scheduleId: string; jobId?: string };
type NodeCronData = { cronExpression?: string };

export type NodeCronLogEntry = BaseLogEntry<NodeCronMetadata, NodeCronData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);
const METHODS = ["validate", "getTasks"] as const;

function log(entry: NodeCronLogEntry) { 
    watchers.scheduler.insertRedisStream({ ...entry, created_at: timestamp() })
}

export function patchNodeCronExports(exports: any, filename: string): any {
  if (typeof exports?.schedule !== "function") return exports;

  shimmer.wrap(exports, "schedule", (originalSchedule: Function) =>
    function patchedSchedule(this: any, cronExpression: string, task: Function, options?: any) {
      const scheduleId = uuidv4();
      const callerInfo = getCallerInfo(filename);

      log({ status: "completed", duration: 0, metadata: { package: "node-cron", type: "schedule", scheduleId }, data: { cronExpression }, location: { file: callerInfo.file, line: callerInfo.line } });

      const wrappedTask = function (this: any, ...args: any[]) {
        const jobId = uuidv4();
        const startTime = performance.now();

        try {
          const result = task.apply(this, args);
          log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), metadata: { package: "node-cron", type: "job", scheduleId, jobId }, data: { cronExpression }, location: { file: callerInfo.file, line: callerInfo.line } });
          return result;
        } catch (error: any) {
          log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), metadata: { package: "node-cron", type: "job", scheduleId, jobId }, data: { cronExpression }, error: { name: "NodeCronError", message: error?.message ?? String(error), stack: error?.stack } });
          throw error;
        }
      };

      const scheduledTask = originalSchedule.call(this, cronExpression, wrappedTask, options);

      if (scheduledTask?.stop) {
        shimmer.wrap(scheduledTask, "stop", (originalStop: Function) =>
          function patchedStop(this: any, ...args: any[]) {
            log({ status: "completed", duration: 0, metadata: { package: "node-cron", type: "stop", scheduleId }, data: { cronExpression }, location: { file: callerInfo.file, line: callerInfo.line } });
            return originalStop.apply(this, args);
          }
        );
      }

      return scheduledTask;
    }
  );

  for (const method of METHODS) {
    if (typeof exports[method] !== "function") continue;
    shimmer.wrap(exports, method, (originalFn: Function) =>
      function patchedMethod(this: any, ...args: any[]) {
        const callerInfo = getCallerInfo(filename);
        log({ status: "completed", duration: 0, metadata: { package: "node-cron", type: method, scheduleId: uuidv4() }, data: {}, location: { file: callerInfo.file, line: callerInfo.line } });
        return originalFn.apply(this, args);
      }
    );
  }

  return exports;
}

