/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { v4 as uuidv4 } from "uuid";
import { getCallerInfo } from "../../core/helpers/helpers";

type BreeMetadata = { package: "bree"; type: string; breeId: string; scheduleId?: string; jobId?: string };
type BreeData = { jobName?: string };

export type BreeLogEntry = BaseLogEntry<BreeMetadata, BreeData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);
const INSTANCE_METHODS = ["add", "start", "stop", "remove"] as const;
const JOB_METHODS = ["run", "stop", "remove"] as const;

function log(entry: BreeLogEntry) { 
    watchers.scheduler.insertRedisStream({ ...entry, created_at: timestamp() })
}

function patchJobMethods(job: any, jobName: string, breeId: string, scheduleId: string, filename: string) {
  for (const method of JOB_METHODS) {
    if (typeof job[method] !== "function") continue;

    shimmer.wrap(job, method, (originalMethod: Function) =>
      function patchedJobMethod(this: any, ...args: any[]) {
        const callerInfo = getCallerInfo(filename);
        const jobId = uuidv4();
        const startTime = performance.now();

        try {
          const result = originalMethod.apply(this, args);
          if (result?.then) {
            return result
              .then((value: any) => { log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), metadata: { package: "bree", type: `job:${method}`, breeId, scheduleId, jobId }, data: { jobName }, location: { file: callerInfo.file, line: callerInfo.line } }); return value; })
              .catch((error: any) => { log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), metadata: { package: "bree", type: `job:${method}`, breeId, scheduleId, jobId }, data: { jobName }, error: { name: "BreeError", message: error?.message ?? String(error), stack: error?.stack } }); throw error; });
          }
          log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), metadata: { package: "bree", type: `job:${method}`, breeId, scheduleId, jobId }, data: { jobName }, location: { file: callerInfo.file, line: callerInfo.line } });
          return result;
        } catch (error: any) {
          log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), metadata: { package: "bree", type: `job:${method}`, breeId, scheduleId, jobId }, data: { jobName }, error: { name: "BreeError", message: error?.message ?? String(error), stack: error?.stack } });
          throw error;
        }
      }
    );
  }
}

export function patchBreeExports(exports: any, filename: string): any {
  shimmer.wrap(exports, "default", (originalConstructor: any) =>
    function patchedConstructor(this: any, ...args: any[]) {
      const callerInfo = getCallerInfo(filename);
      const breeInstance = new originalConstructor(...args);
      const breeId = uuidv4();
      breeInstance._observerId = breeId;
      log({ status: "completed", duration: 0, metadata: { package: "bree", type: "create", breeId }, data: { jobName: "init" }, location: { file: callerInfo.file, line: callerInfo.line } });
      return breeInstance;
    }
  );

  for (const method of INSTANCE_METHODS) {
    shimmer.wrap(exports.prototype, method, (originalFn) =>
      function patchedMethod(this: any, ...args: any[]) {
        const callerInfo = getCallerInfo(filename);
        const breeId = this._observerId || uuidv4();
        const scheduleId = uuidv4();
        let jobName = "";

        if (method === "add") {
          jobName = typeof args[0] === "string" ? args[0] : args[0]?.name || "unnamed";
        } else {
          jobName = typeof args[0] === "string" ? args[0] : Array.isArray(args[0]) ? args[0].join(",") : args[0] === undefined ? "all" : "";
        }

        const base = { metadata: { package: "bree" as const, type: method, breeId, scheduleId }, data: { jobName } };

        try {
          const result = originalFn.apply(this, args);
          if (result?.then) {
            return result
              .then((value: any) => { log({ status: "completed", duration: 0, location: { file: callerInfo.file, line: callerInfo.line }, ...base }); return value; })
              .catch((error: any) => { log({ status: "failed", duration: 0, ...base, error: { name: "BreeError", message: error?.message ?? String(error), stack: error?.stack } }); throw error; });
          }
          if (method === "add" && result && this.config?.jobs) {
            const addedJob = this.config.jobs.find((job: any) => job.name === jobName);
            if (addedJob) patchJobMethods(addedJob, jobName, breeId, scheduleId, filename);
          }
          log({ status: "completed", duration: 0, location: { file: callerInfo.file, line: callerInfo.line }, ...base });
          return result;
        } catch (error: any) {
          log({ status: "failed", duration: 0, ...base, error: { name: "BreeError", message: error?.message ?? String(error), stack: error?.stack } });
          throw error;
        }
      }
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
          const jobId = uuidv4();
          if (!this._observerJobTimes) this._observerJobTimes = {};
          this._observerJobTimes[name] = { jobId, startTime: performance.now() };
        });
        this.on("worker completed", (name: string) => {
          const jobInfo = this._observerJobTimes?.[name] || { jobId: uuidv4(), startTime: performance.now() };
          log({ status: "completed", duration: parseFloat((performance.now() - jobInfo.startTime).toFixed(2)), metadata: { package: "bree", type: "worker", breeId, jobId: jobInfo.jobId }, data: { jobName: name }, location: { file: callerInfo.file, line: callerInfo.line } });
          delete this._observerJobTimes?.[name];
        });
        this.on("worker errored", (error: any, name: string) => {
          const jobInfo = this._observerJobTimes?.[name] || { jobId: uuidv4(), startTime: performance.now() };
          log({ status: "failed", duration: parseFloat((performance.now() - jobInfo.startTime).toFixed(2)), metadata: { package: "bree", type: "worker", breeId, jobId: jobInfo.jobId }, data: { jobName: name }, error: { name: "BreeError", message: error?.message ?? String(error), stack: error?.stack } });
          delete this._observerJobTimes?.[name];
        });
      }
      return result;
    };
  }

  return exports;
}

