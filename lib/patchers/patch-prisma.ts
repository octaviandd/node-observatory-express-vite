import { Hook } from 'require-in-the-middle';
import shimmer from 'shimmer';
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";

const PRISMA_PATCHED_SYMBOL = Symbol.for('node-observer:prisma-patched');

function patchPrismaModels(prisma: any) {
  const methodsToPatch = [
    'findMany',
    'findUnique',
    'findUniqueOrThrow',
    'findFirst',
    'findFirstOrThrow',
    'create',
    'createMany',
    'update',
    'updateMany',
    'delete',
    'deleteMany',
    'upsert',
    'aggregate',
    'groupBy',
    'count',
  ];

  // Prisma attaches model properties (like prisma.user, prisma.post) dynamically.
  for (const modelName in prisma) {
    // Skip non-model properties.
    if (!Object.prototype.hasOwnProperty.call(prisma, modelName)) continue;
    const model = prisma[modelName];
    if (typeof model !== 'object' || model === null) continue;

    methodsToPatch.forEach((method) => {
      if (typeof model[method] === 'function') {
        shimmer.wrap(model, method, (originalMethod: Function) => {
          return async function patchedMethod(this: any, ...args: any[]) {
            const callerInfo = getCallerInfo(__filename);
            const start = performance.now();
            try {
              const result = await originalMethod.apply(this, args);
              const duration = (performance.now() - start).toFixed(2);

              watchers.model.addContent({
                method,
                modelName,
                args,
                duration,
                status: 'success',
                file: callerInfo.file,
                line: callerInfo.line,
              })

              return result;
            } catch (error: any) {
              const duration = (performance.now() - start).toFixed(2);

              watchers.model.addContent({
                method,
                modelName,
                args,
                duration,
                status: 'error',
                error: error.message,
                file: callerInfo.file,
                line: callerInfo.line,
              })

              throw error;
            }
          };
        });
      }
    });
  }
}

if (process.env.NODE_OBSERVATORY_DATABASES && JSON.parse(process.env.NODE_OBSERVATORY_DATABASES).includes("prisma")) {
  if (!(global as any)[PRISMA_PATCHED_SYMBOL]) {
    (global as any)[PRISMA_PATCHED_SYMBOL] = true;

    new Hook(['@prisma/client'], (exports: any, name, basedir) => {
      if (!exports || !exports.PrismaClient) {
        return exports;
      }

      const OriginalPrismaClient = exports.PrismaClient;

      function PatchedPrismaClient(...args: any[]) {
        const instance = new OriginalPrismaClient(...args);
        patchPrismaModels(instance);
        return instance;
      }

      PatchedPrismaClient.prototype = OriginalPrismaClient.prototype;
      Object.setPrototypeOf(PatchedPrismaClient, OriginalPrismaClient);

      exports.PrismaClient = PatchedPrismaClient;
      return exports;
    });
  }
}
