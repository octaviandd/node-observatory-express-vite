/** @format */

import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type FetchMetadata = { package: "fetch"; method: string };
type FetchData = { hostname: string; pathname: string; statusCode?: number };

export type FetchHttpLogEntry = BaseLogEntry<FetchMetadata, FetchData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: FetchHttpLogEntry) { 
    watchers.http.insertRedisStream({ ...entry, created_at: timestamp() })
}

export function applyFetchPatch(filename: string) {
  if (typeof globalThis.fetch !== "function") return;

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async function patchedFetch(url, options = {}) {
    const startTime = performance.now();
    const req = new Request(url, options);
    const callerInfo = getCallerInfo(filename);
    const urlObj = new URL(req.url);

    const base = { metadata: { package: "fetch" as const, method: req.method }, data: { hostname: urlObj.hostname, pathname: urlObj.pathname } };

    try {
      const response = await originalFetch(url, options);

      return new Proxy(response, {
        get: (target, prop) => {
          if (["json", "text", "arrayBuffer", "blob", "formData"].includes(prop as string)) {
            const originalMethod = target[prop as keyof Response];

            return async function () {
              try {
                log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, ...base, data: { ...base.data, statusCode: target.status } });
                return (originalMethod as Function).apply(target);
              } catch {
                return (originalMethod as Function).apply(target);
              }
            };
          }

          return target[prop as keyof Response];
        },
      });
    } catch (error: any) {
      log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), ...base, data: { ...base.data, statusCode: 500 }, error: { name: error.name, message: error.message, stack: error.stack } });
      throw error;
    }
  };
}

