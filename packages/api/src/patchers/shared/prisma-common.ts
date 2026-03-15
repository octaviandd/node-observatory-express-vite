/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: ModelContent) {
  watchers.model.insertRedisStream({ ...entry });
}

const METHODS_TO_PATCH = [
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "create",
  "createMany",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
  "aggregate",
  "groupBy",
  "count",
] as const;

function patchPrismaModels(prisma: any, filename: string) {
  for (const modelName in prisma) {
    if (!Object.prototype.hasOwnProperty.call(prisma, modelName)) continue;
    const model = prisma[modelName];
    if (typeof model !== "object" || model === null) continue;

    for (const method of METHODS_TO_PATCH) {
      if (typeof model[method] !== "function") continue;

      shimmer.wrap(
        model,
        method,
        (originalMethod: Function) =>
          async function patchedMethod(this: any, ...args: any[]) {
            const callerInfo = getCallerInfo(filename);
            const startTime = performance.now();

            try {
              const result = await originalMethod.apply(this, args);

              log({
                metadata: {
                  package: "prisma",
                  duration: parseFloat(
                    (performance.now() - startTime).toFixed(2),
                  ),
                  location: { file: callerInfo.file, line: callerInfo.line },
                  created_at: timestamp(),
                },
                data: {
                  status: "completed",
                  method,
                  modelName,
                },
              });

              return result;
            } catch (error: any) {
              log({
                metadata: {
                  package: "prisma",
                  duration: parseFloat(
                    (performance.now() - startTime).toFixed(2),
                  ),
                  location: { file: callerInfo.file, line: callerInfo.line },
                  created_at: timestamp(),
                },
                data: {
                  status: "failed",
                  method,
                  modelName,
                },
                error: {
                  name: "PrismaError",
                  message: error.message,
                  stack: error.stack,
                },
              });

              throw error;
            }
          },
      );
    }
  }
}

export function patchPrismaExports(exports: any, filename: string): any {
  if (!exports?.PrismaClient) return exports;

  const OriginalPrismaClient = exports.PrismaClient;

  function PatchedPrismaClient(...args: any[]) {
    const instance = new OriginalPrismaClient(...args);
    patchPrismaModels(instance, filename);
    return instance;
  }

  PatchedPrismaClient.prototype = OriginalPrismaClient.prototype;
  Object.setPrototypeOf(PatchedPrismaClient, OriginalPrismaClient);

  exports.PrismaClient = PatchedPrismaClient;
  return exports;
}
