/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers, patchedGlobal } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";
import { v4 as uuidv4 } from "uuid";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";

if (
  process.env.NODE_OBSERVATORY_JOBS &&
  JSON.parse(process.env.NODE_OBSERVATORY_JOBS).includes("agenda")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.AGENDA_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.AGENDA_PATCHED_SYMBOL] = true;

    const METHODS_TO_PATCH = {
      schedule: "schedule",
      cancel: "cancel",
      create: "create",
      purge: "purge",
      scheduleJob: "scheduleJob",
      now: "now",
      saveJob: "saveJob",
      define: "define",
    };

    new Hook(["agenda"], function (exports: any) {
      // Agenda typically exports a class, access its prototype
      if (exports && exports.prototype) {
        const AgendaProto = exports.prototype;

        Object.entries(METHODS_TO_PATCH).forEach(
          ([methodName, displayName]) => {
            if (typeof AgendaProto[methodName] === "function") {
              shimmer.wrap(AgendaProto, methodName, function (originalFn) {
                return async function patchedAgendaMethod(
                  this: any,
                  ...args: any[]
                ) {
                  const callerInfo = getCallerInfo(__filename);

                  let result;
                  let didFail = false;
                  let failReason;

                  // ───── Log when a job is scheduled ─────
                  if (
                    methodName === "schedule" ||
                    methodName === "scheduleJob"
                  ) {
                    const jobData = args[1];
                    watchers.jobs.insertRedisStream({
                      status: "scheduled",
                      method: displayName,
                      queue: this.name,
                      jobData,
                      token: this.token,
                      file: callerInfo.file,
                      line: callerInfo.line,
                      package: "agenda",
                    });
                  }

                  // ───── Log when a job is created ─────
                  if (methodName === "create" && args[0]) {
                    const jobName = args[0];
                    const jobData = args[1] || {};
                    watchers.jobs.insertRedisStream({
                      status: "started",
                      method: displayName,
                      queue: this.name,
                      connectionName: this._collection?.dbName || "default",
                      jobData,
                      jobId: args[0]?.attrs?._id || uuidv4(),
                      token: this.token,
                      file: callerInfo.file,
                      line: callerInfo.line,
                      package: "agenda",
                    });
                  }

                  // ───── Log when a job is started immediately ─────
                  if (methodName === "now" && args[0]) {
                    const jobName = args[0];
                    const jobData = args[1] || {};
                    watchers.jobs.insertRedisStream({
                      status: "started",
                      method: displayName,
                      queue: this.name,
                      connectionName: this._collection?.dbName || "default",
                      jobData,
                      jobId: args[0]?.attrs?._id || uuidv4(),
                      token: this.token,
                      file: callerInfo.file,
                      line: callerInfo.line,
                      package: "agenda",
                    });
                  }

                  try {
                    // Call the original function
                    result = await originalFn.apply(this, args);
                    return result;
                  } catch (err: any) {
                    didFail = true;
                    failReason = err?.message || err;
                    throw err;
                  }
                };
              });
            }
          },
        );

        // Patch the job execution logic to track attempt duration and retries
        if (typeof AgendaProto.processJobs === "function") {
          shimmer.wrap(AgendaProto, "processJobs", function (originalFn) {
            return async function patchedProcessJobs(
              this: any,
              ...args: any[]
            ) {
              const job = args[0];
              const attemptStartTime = performance.now();

              // Log processing start
              watchers.jobs.insertRedisStream({
                status: "processing",
                method: "processJobs",
                queue: this.name,
                connectionName: this._collection?.dbName || "default",
                jobId: job.attrs._id,
                token: this.token,
                file: job.attrs.file || job.attrs.lastRunAt?.file,
                line: job.attrs.line || job.attrs.lastRunAt?.line,
                attemptsMade: job.attrs.failCount,
                package: "agenda",
              });

              try {
                // Call the original function
                const result = await originalFn.apply(this, args);
                const attemptEndTime = performance.now();
                const duration = parseFloat(
                  (attemptEndTime - attemptStartTime).toFixed(2),
                );

                // Log successful completion
                watchers.jobs.insertRedisStream({
                  status: "completed",
                  method: "processJobs",
                  queue: this.name,
                  connectionName: this._collection?.dbName || "default",
                  jobId: job.attrs._id,
                  token: this.token,
                  file: job.attrs.file || job.attrs.lastRunAt?.file,
                  line: job.attrs.line || job.attrs.lastRunAt?.line,
                  duration,
                  attemptsMade: job.attrs.failCount,
                  returnValue: result,
                  package: "agenda",
                });

                return result;
              } catch (err: any) {
                const attemptEndTime = performance.now();
                const duration = parseFloat(
                  (attemptEndTime - attemptStartTime).toFixed(2),
                );
                const failReason = err?.message || err;

                // Check if the job will be retried
                const maxAttempts = job.attrs.data?.maxAttempts || 0;
                const willRetry = job.attrs.failCount < maxAttempts;

                if (willRetry) {
                  // Log retry attempt
                  watchers.jobs.insertRedisStream({
                    status: "released",
                    method: "processJobs",
                    queue: this.name,
                    connectionName: this._collection?.dbName || "default",
                    jobId: job.attrs._id,
                    duration,
                    token: this.token,
                    file: job.attrs.file || job.attrs.lastRunAt?.file,
                    line: job.attrs.line || job.attrs.lastRunAt?.line,
                    attemptsMade: job.attrs.failCount,
                    package: "agenda",
                  });
                } else {
                  // Log final failure
                  watchers.jobs.insertRedisStream({
                    status: "failed",
                    method: "processJobs",
                    queue: this.name,
                    connectionName: this._collection?.dbName || "default",
                    jobId: job.attrs._id,
                    token: this.token,
                    file: job.attrs.file || job.attrs.lastRunAt?.file,
                    line: job.attrs.line || job.attrs.lastRunAt?.line,
                    duration,
                    attemptsMade: job.attrs.failCount,
                    failedReason: failReason,
                    package: "agenda",
                  });
                }

                throw err;
              }
            };
          });
        }
      }
      return exports;
    });
  }
}
