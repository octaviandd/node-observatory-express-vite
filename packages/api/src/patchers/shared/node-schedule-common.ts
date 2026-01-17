/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { v4 as uuidv4 } from "uuid";
import { getCallerInfo } from "../../core/helpers/helpers";

type NodeScheduleMetadata = { package: "node-schedule"; type: string; scheduleId: string; jobId?: string };
type NodeScheduleData = { name?: string | null; rule?: any };

export type NodeScheduleLogEntry = BaseLogEntry<NodeScheduleMetadata, NodeScheduleData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);
const METHODS = ["rescheduleJob", "cancelJob", "cancelNext"] as const;

function log(entry: NodeScheduleLogEntry) { 
    watchers.scheduler.insertRedisStream({ ...entry, created_at: timestamp() })
}

export function patchNodeScheduleExports(exports: any, filename: string): any {
  if (typeof exports?.scheduleJob !== "function") return exports;

  shimmer.wrap(exports, "scheduleJob", (originalScheduleJob: Function) =>
    function patchedScheduleJob(this: any, name: string | null, rule: any, task: Function) {
      const scheduleId = uuidv4();
      const callerInfo = getCallerInfo(filename);

      log({ status: "completed", duration: 0, metadata: { package: "node-schedule", type: "schedule", scheduleId }, data: { name, rule }, location: { file: callerInfo.file, line: callerInfo.line } });

      const wrappedTask = function (this: any, ...args: any[]) {
        const jobId = uuidv4();
        const startTime = performance.now();

        try {
          const result = task.apply(this, args);
          log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), metadata: { package: "node-schedule", type: "job", scheduleId, jobId }, data: { name }, location: { file: callerInfo.file, line: callerInfo.line } });
          return result;
        } catch (error: any) {
          log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), metadata: { package: "node-schedule", type: "job", scheduleId, jobId }, data: { name }, error: { name: "NodeScheduleError", message: error?.message ?? String(error), stack: error?.stack } });
          throw error;
        }
      };

      const job = originalScheduleJob.call(this, name, rule, wrappedTask);

      if (job) {
        if (typeof job.cancel === "function") {
          shimmer.wrap(job, "cancel", (originalCancel: Function) =>
            function patchedCancel(this: any, ...args: any[]) {
              log({ status: "completed", duration: 0, metadata: { package: "node-schedule", type: "cancel", scheduleId }, data: { name: job.name }, location: { file: callerInfo.file, line: callerInfo.line } });
              return originalCancel.apply(this, args);
            }
          );
        }
        if (typeof job.reschedule === "function") {
          shimmer.wrap(job, "reschedule", (originalReschedule: Function) =>
            function patchedReschedule(this: any, spec: any, ...args: any[]) {
              log({ status: "completed", duration: 0, metadata: { package: "node-schedule", type: "reschedule", scheduleId }, data: { name: job.name, rule: spec }, location: { file: callerInfo.file, line: callerInfo.line } });
              return originalReschedule.apply(this, [spec, ...args]);
            }
          );
        }
      }

      return job;
    }
  );

  for (const method of METHODS) {
    if (typeof exports[method] !== "function") continue;
    shimmer.wrap(exports, method, (originalFn: Function) =>
      function patchedMethod(this: any, ...args: any[]) {
        const callerInfo = getCallerInfo(filename);
        log({ status: "completed", duration: 0, metadata: { package: "node-schedule", type: method, scheduleId: uuidv4() }, data: {}, location: { file: callerInfo.file, line: callerInfo.line } });
        return originalFn.apply(this, args);
      }
    );
  }

  return exports;
}

