/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type TypeOrmMetadata = { package: "typeorm"; method: string; modelName: string };
type TypeOrmData = {};

export type TypeOrmLogEntry = BaseLogEntry<TypeOrmMetadata, TypeOrmData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: TypeOrmLogEntry) { 
    watchers.model.insertRedisStream({ ...entry, created_at: timestamp() })
}

const METHODS_TO_PATCH = [
  "save", "find", "findOne", "findBy", "findAndCount",
  "findOneBy", "findOneOrFail", "count", "countBy",
  "remove", "update", "insert", "query",
] as const;

function createPatchedMethod(method: string, getModelName: (ctx: any) => string, filename: string) {
  return function (originalMethod: Function) {
    return async function patchedMethod(this: any, ...args: any[]) {
      const startTime = performance.now();
      const callerInfo = getCallerInfo(filename);

      const base = { metadata: { package: "typeorm" as const, method, modelName: getModelName(this) }, data: {} };

      try {
        const result = await originalMethod.apply(this, args);
        log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, ...base });
        return result;
      } catch (error: any) {
        log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), error: { name: "TypeOrmError", message: error?.message, stack: error?.stack }, ...base });
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
        createPatchedMethod(method, (ctx) => ctx.target?.name, filename)
      );
    }
  }

  // Patch BaseEntity.prototype.save
  if (typeormModule.BaseEntity?.prototype?.save) {
    shimmer.wrap(
      typeormModule.BaseEntity.prototype,
      "save",
      createPatchedMethod("save", (ctx) => ctx.constructor.name, filename)
    );
  }

  return exports;
}