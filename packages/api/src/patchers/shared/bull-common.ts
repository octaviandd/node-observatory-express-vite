/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";
import { v4 as uuidv4 } from "uuid";
import { jobLocalStorage } from "../../core/store";

type BullMetadata = { 
  package: "bull"; 
  method: string; 
  queue: string; 
  connectionName: string;
};

type BullData = { 
  jobId?: string; 
  jobData?: any;
  attemptsMade?: number; 
  failedReason?: string;
  delay?: number;
  priority?: number;
};

export type BullJobLogEntry = BaseLogEntry<BullMetadata, BullData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: BullJobLogEntry) { 
  console.log('Bull Job Entry:', entry);
  watchers.jobs.insertRedisStream({ ...entry, created_at: timestamp() });
}

const METHODS_TO_PATCH = ["process", "add", "processJob"] as const;

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
          
          const redisOptions = this.client?.options || this.clients?.[0]?.options;
          const connectionName = redisOptions?.host 
            ? `${redisOptions.host}:${redisOptions.port}` 
            : "localhost:6379";
          
          const queueName = this.name || "unknown";

          const base = { 
            metadata: { 
              package: "bull" as const, 
              method, 
              queue: queueName, 
              connectionName 
            },
            location: { 
              file: callerInfo.file, 
              line: callerInfo.line 
            }
          };

          // Handle queue.add() - job creation
          if (method === "add") {
            const jobData = args[0]; // First arg is job data
            const jobOptions = args[1] || {}; // Second arg is options
            
            const startTime = performance.now();
            
            try {
              const result = await originalFn.apply(this, args);
              const duration = parseFloat((performance.now() - startTime).toFixed(2));
              
              log({ 
                status: "completed", 
                duration,
                ...base,
                data: { 
                  jobId: result.id,
                  jobData: typeof jobData === 'object' ? JSON.stringify(jobData) : String(jobData),
                  delay: jobOptions.delay,
                  priority: jobOptions.priority,
                } 
              });
              
              return result;
            } catch (err: any) {
              const duration = parseFloat((performance.now() - startTime).toFixed(2));
              
              log({ 
                status: "failed", 
                duration,
                ...base,
                data: { 
                  jobData: typeof jobData === 'object' ? JSON.stringify(jobData) : String(jobData),
                },
                error: {
                  name: err.name || "BullError",
                  message: err.message || String(err),
                  stack: err.stack,
                }
              });
              
              throw err;
            }
          }

          // Handle queue.processJob() - job execution
          if (method === "processJob" && args[0]) {
            const job = args[0];
            const attemptStartTime = performance.now();
            
            try {
              const result = await originalFn.apply(this, args);
              
              const { processedOn, finishedOn, attemptsMade } = job;
              let duration = processedOn && finishedOn 
                ? parseFloat(((finishedOn - processedOn)).toFixed(2)) 
                : parseFloat((performance.now() - attemptStartTime).toFixed(2));

              log({ 
                status: "completed", 
                duration,
                ...base,
                data: { 
                  jobId: job.id,
                  jobData: typeof job.data === 'object' ? JSON.stringify(job.data) : String(job.data),
                  attemptsMade,
                } 
              });
              
              return result;
            } catch (err: any) {
              const job = args[0];
              const duration = parseFloat((performance.now() - attemptStartTime).toFixed(2));
              
              log({ 
                status: "failed", 
                duration,
                ...base,
                data: { 
                  jobId: job.id,
                  jobData: typeof job.data === 'object' ? JSON.stringify(job.data) : String(job.data),
                  attemptsMade: job.attemptsMade,
                  failedReason: err.message,
                },
                error: {
                  name: err.name || "JobProcessingError",
                  message: err.message || String(err),
                  stack: err.stack,
                }
              });
              
              throw err;
            }
          }

          // Handle queue.process() - processor registration
          if (method === "process") {
            console.log(`Bull: Registered processor for queue "${queueName}"`);
            return originalFn.apply(this, args);
          }

          // Fallback for other methods
          return originalFn.apply(this, args);
        });
      }
    );
  }

  return exports;
}