/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";
import { v4 as uuidv4 } from "uuid";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: JobContent) {
  watchers.jobs.insertRedisStream({ ...entry });
}

const METHODS_TO_PATCH = [
  "schedule",
  "cancel",
  "create",
  "purge",
  "scheduleJob",
  "now",
  "saveJob",
  "define",
] as const;

export function patchAgendaExports(exports: any, filename: string): any {
  if (!exports?.prototype) return exports;

  const AgendaProto = exports.prototype;

  for (const method of METHODS_TO_PATCH) {
    if (typeof AgendaProto[method] !== "function") continue;

    shimmer.wrap(
      AgendaProto,
      method,
      (originalFn) =>
        async function patchedMethod(this: any, ...args: any[]) {
          const callerInfo = getCallerInfo(filename);

          if (
            method === "schedule" ||
            method === "scheduleJob" ||
            method === "create" ||
            method === "now"
          ) {
            log({
              metadata: {
                package: "agenda",
                duration: 0,
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: {
                method,
                status: "completed",
                queue: this.name,
                connectionName: this._collection?.dbName || "default",
                jobId: args[0]?.attrs?._id || uuidv4(),
              },
            });
          }

          try {
            return await originalFn.apply(this, args);
          } catch (err) {
            throw err;
          }
        },
    );
  }

  if (typeof AgendaProto.processJobs === "function") {
    shimmer.wrap(
      AgendaProto,
      "processJobs",
      (originalFn) =>
        async function patchedProcessJobs(this: any, ...args: any[]) {
          const job = args[0];
          const startTime = performance.now();

          try {
            const result = await originalFn.apply(this, args);

            log({
              metadata: {
                package: "agenda",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: {
                  file: job.attrs.file || "agenda",
                  line: job.attrs.line || "0",
                },
                created_at: timestamp(),
              },
              data: {
                method: "processJobs",
                status: "completed",
                queue: this.name,
                connectionName: this._collection?.dbName || "default",
                jobId: job.attrs._id,
                attemptsMade: job.attrs.failCount,
              },
            });

            return result;
          } catch (err: any) {
            log({
              metadata: {
                package: "agenda",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: {
                  file: job.attrs.file || "agenda",
                  line: job.attrs.line || "0",
                },
                created_at: timestamp(),
              },
              data: {
                method: "processJobs",
                status: "failed",
                queue: this.name,
                connectionName: this._collection?.dbName || "default",
                jobId: job.attrs._id,
                attemptsMade: job.attrs.failCount,
                failedReason: err?.message,
              },
              error: {
                name: "AgendaError",
                message: err?.message,
              },
            });

            throw err;
          }
        },
    );
  }

  return exports;
}
