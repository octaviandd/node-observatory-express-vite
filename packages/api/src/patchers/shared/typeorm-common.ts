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
  "save",
  "find",
  "findOne",
  "findBy",
  "findAndCount",
  "findOneBy",
  "findOneOrFail",
  "count",
  "countBy",
  "remove",
  "update",
  "insert",
  "query",
] as const;

function createPatchedMethod(
  method: string,
  getModelName: (ctx: any) => string,
  filename: string,
) {
  return function (originalMethod: Function) {
    return async function patchedMethod(this: any, ...args: any[]) {
      const startTime = performance.now();
      const callerInfo = getCallerInfo(filename);

      try {
        const result = await originalMethod.apply(this, args);

        log({
          metadata: {
            package: "typeorm",
            duration: parseFloat((performance.now() - startTime).toFixed(2)),
            location: { file: callerInfo.file, line: callerInfo.line },
            created_at: timestamp(),
          },
          data: {
            status: "completed",
            method,
            modelName: getModelName(this),
          },
        });

        return result;
      } catch (error: any) {
        log({
          metadata: {
            package: "typeorm",
            duration: parseFloat((performance.now() - startTime).toFixed(2)),
            location: { file: callerInfo.file, line: callerInfo.line },
            created_at: timestamp(),
          },
          data: {
            status: "failed",
            method,
            modelName: getModelName(this),
          },
          error: {
            name: "TypeOrmError",
            message: error?.message,
            stack: error?.stack,
          },
        });

        throw error;
      }
    };
  };
}

export function patchTypeOrmExports(exports: any, filename: string): any {
  const typeormModule = exports.default || exports;

  if (!typeormModule?.Repository) return exports;

  // Patch Repository.prototype methods
  for (const method of METHODS_TO_PATCH) {
    if (typeof typeormModule.Repository.prototype[method] === "function") {
      shimmer.wrap(
        typeormModule.Repository.prototype,
        method,
        createPatchedMethod(method, (ctx) => ctx.target?.name, filename),
      );
    }
  }

  // Patch BaseEntity.prototype.save
  if (typeormModule.BaseEntity?.prototype?.save) {
    shimmer.wrap(
      typeormModule.BaseEntity.prototype,
      "save",
      createPatchedMethod("save", (ctx) => ctx.constructor.name, filename),
    );
  }

  return exports;
}
