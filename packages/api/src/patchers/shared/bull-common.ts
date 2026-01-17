/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";
import { v4 as uuidv4 } from "uuid";
import { jobLocalStorage } from "../../core/store";

type BullMetadata = { package: "bull"; method: string; queue: string; connectionName: string };
type BullData = { jobId?: string; attemptsMade?: number; failedReason?: string };

export type BullJobLogEntry = BaseLogEntry<BullMetadata, BullData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: BullJobLogEntry) { 
    watchers.jobs.insertRedisStream({ ...entry, created_at: timestamp() })
}

const METHODS_TO_PATCH = ["process", "add", "retryJob", "start", "pause", "resume", "processJob"] as const;

export function patchBullExports(exports: any, filename: string): any {
  if (!exports?.prototype) return exports;

  const BullQueueProto = exports.prototype;

  for (const method of METHODS_TO_PATCH) {
    if (typeof BullQueueProto[method] !== "function") continue;

    shimmer.wrap(BullQueueProto, method, (originalFn) =>
      async function patchedBullMethod(this: any, ...args: any[]) {
        const callerInfo = getCallerInfo(filename);
        const jobId = uuidv4();

        return jobLocalStorage.run(new Map(), async () => {
          jobLocalStorage.getStore()!.set("jobId", jobId);
          const redisOptions = this.queue?.client?.options || this.client?.options;
          const connectionName = redisOptions?.host ? `${redisOptions.host}:${redisOptions.port}` : "default";

          const base = { metadata: { package: "bull" as const, method, queue: this.queue?.name || this.name, connectionName } };
          let attemptStartTime: number | undefined;

          if (method === "add") {
            log({ status: "completed", duration: 0, location: { file: callerInfo.file, line: callerInfo.line }, ...base, data: {} });
          }

          if (method === "processJob" && args[0]) {
            attemptStartTime = performance.now();
          }

          try {
            const result = await originalFn.apply(this, args);

            if (method === "processJob" && args[0]) {
              const job = args[0];
              const { processedOn, finishedOn, failedReason, attemptsMade, opts } = job;
              let duration = processedOn && finishedOn ? parseFloat((finishedOn - processedOn).toFixed(2)) : 0;
              if (!finishedOn && attemptStartTime) duration = parseFloat((performance.now() - attemptStartTime).toFixed(2));

              if (failedReason) {
                log({ status: "failed", duration, ...base, data: { jobId: job.id, attemptsMade, failedReason }, error: { name: "BullError", message: failedReason } });
              } else {
                log({ status: "completed", duration, location: { file: callerInfo.file, line: callerInfo.line }, ...base, data: { jobId: job.id, attemptsMade } });
              }
            }

            return result;
          } catch (err) {
            throw err;
          }
        });
      }
    );
  }

  return exports;
}

