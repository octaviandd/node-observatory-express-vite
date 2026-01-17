/** @format */

import shimmer from "shimmer";
import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { watchers } from "../../core/index";
import { requestLocalStorage } from "../../core/store";

const MAX_PAYLOAD_SIZE = 1024 * 50;

export interface ExpressRequestLogEntry {
  status: "completed" | "failed";
  duration: number;
  metadata: { package: "express"; method: string };
  data: {
    route: string;
    statusCode: number;
    requestSize: number;
    responseSize: number;
    payload?: string;
    headers?: Record<string, any>;
    query?: Record<string, any>;
    params?: Record<string, any>;
    ip?: string;
    memoryUsage?: NodeJS.MemoryUsage;
    session?: Record<string, any>;
  };
  location?: { file: string; line: string };
  error?: { message: string; name: string; stack?: string };
}

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: ExpressRequestLogEntry) {
  if (watchers?.requests) {
    watchers.requests.insertRedisStream({ ...entry, created_at: timestamp() })
  }
}

function getByteLength(chunk: any, encoding: string = "utf8"): number {
  try {
    return Buffer.byteLength(
      typeof chunk === "string" ? chunk : Buffer.isBuffer(chunk) ? chunk : JSON.stringify(chunk || {}),
      encoding as BufferEncoding
    );
  } catch {
    return 0;
  }
}

export function patchExpressExports(exports: any): any {
  if (!exports?.application?.handle || !exports?.response) return exports;

  // Patch application.handle
  shimmer.wrap(exports.application, "handle", (originalAppHandle) =>
    function wrappedAppHandle(this: any, req: ExpressRequest, res: ExpressResponse, next: NextFunction) {
      // Skip internal routes
      if (
        req.originalUrl &&
        (req.originalUrl.includes("/ui") ||
          /\/api\/(requests|queries|notifications|mails|exceptions|jobs|schedules|https?|cache|logs|views|models)/.test(req.originalUrl))
      ) {
        return originalAppHandle.call(this, req, res, next);
      }

      // Skip SSE connections
      if (
        res.getHeader("Content-Type") === "text/event-stream" ||
        req.headers.accept?.includes("text/event-stream") ||
        res.getHeader("Cache-Control") === "no-transform"
      ) {
        return originalAppHandle.call(this, req, res, next);
      }

      // Avoid re-entering ALS
      if (requestLocalStorage.getStore()) {
        return originalAppHandle.call(this, req, res, next);
      }

      return requestLocalStorage.run(new Map(), () => {
        const store = requestLocalStorage.getStore()!;
        const startTime = performance.now();

        store.set("requestId", uuidv4());
        store.set("startTime", startTime);
        store.set("payload", "");
        store.set("totalWrittenBytes", 0);
        store.set("responseSizeMeasuredBySend", false);
        store.set("logged", false);

        // Capture request payload
        const originalReqOn = req.on;
        req.on = function (event, listener) {
          if (event === "data" && (store.get("payload")?.length || 0) < MAX_PAYLOAD_SIZE) {
            return originalReqOn.call(this, event, (chunk: any) => {
              const currentStore = requestLocalStorage.getStore();
              if (currentStore) {
                let payload = currentStore.get("payload") || "";
                try {
                  payload += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : typeof chunk === "string" ? chunk : JSON.stringify(chunk);
                } catch {
                  payload += "[Error converting chunk]";
                }
                currentStore.set("payload", payload);
              }
              listener(chunk);
            });
          }
          return originalReqOn.call(this, event, listener);
        };

        // Capture response size via write
        const originalResWrite = res.write;
        res.write = function (this: ExpressResponse, chunk: any, encoding?: any, callback?: any): boolean {
          const currentStore = requestLocalStorage.getStore();
          if (currentStore) {
            const size = getByteLength(chunk, typeof encoding === "string" ? encoding : "utf8");
            currentStore.set("totalWrittenBytes", (currentStore.get("totalWrittenBytes") || 0) + size);
          }
          return originalResWrite.call(this, chunk, encoding, callback);
        };

        // Final logging via res.end
        const originalResEnd = res.end;
        res.end = function (this: ExpressResponse, chunk?: any, encoding?: any, callback?: any): ExpressResponse {
          const finalStore = requestLocalStorage.getStore();

          if (finalStore && !finalStore.get("logged")) {
            finalStore.set("logged", true);

            const endTime = performance.now();
            const storedStartTime = finalStore.get("startTime") || endTime;
            let responseSize = finalStore.get("totalWrittenBytes") || 0;
            const wasSendUsed = finalStore.get("responseSizeMeasuredBySend") || false;
            const endChunkSize = chunk ? getByteLength(chunk, typeof encoding === "string" ? encoding : "utf8") : 0;

            if (responseSize === 0 && !wasSendUsed) responseSize = endChunkSize;
            else if (endChunkSize > 0) responseSize += endChunkSize;

            const logContent: ExpressRequestLogEntry = {
              status: res.statusCode >= 400 ? "failed" : "completed",
              duration: parseFloat((endTime - storedStartTime).toFixed(2)),
              metadata: { package: "express", method: req.method?.toLowerCase() || "unknown" },
              data: {
                route: req.originalUrl || req.url,
                statusCode: res.statusCode,
                requestSize: parseFloat(req.headers["content-length"] || "0"),
                responseSize,
                payload: finalStore.get("payload") || "",
                headers: req.headers,
                query: req.query,
                params: req.params,
                ip: req.ip,
                memoryUsage: process.memoryUsage(),
                session: (req as any).session || {},
              },
              location: { file: "express", line: "0" },
            };

            if (res.locals?.error instanceof Error) {
              logContent.error = { message: res.locals.error.message, name: res.locals.error.name, stack: res.locals.error.stack };
              if (logContent.data.statusCode < 400) logContent.data.statusCode = 500;
            }

            if (req.originalUrl && !req.originalUrl.includes("/ui/")) {
              log(logContent);
            }
          }

          return originalResEnd.call(this, chunk, encoding, callback);
        };

        try {
          return originalAppHandle.call(this, req, res, next);
        } catch (error: any) {
          const errorStore = requestLocalStorage.getStore();
          if (errorStore && !errorStore.get("logged")) {
            errorStore.set("logged", true);

            log({
              status: "failed",
              duration: parseFloat((performance.now() - (errorStore.get("startTime") || performance.now())).toFixed(2)),
              metadata: { package: "express", method: req.method?.toLowerCase() || "unknown" },
              data: {
                route: req.originalUrl || req.url,
                statusCode: res.statusCode >= 400 ? res.statusCode : 500,
                requestSize: parseFloat(req.headers["content-length"] || "0"),
                responseSize: 0,
                payload: errorStore.get("payload") || "",
                headers: req.headers,
                query: req.query,
                params: req.params,
                ip: req.ip,
                memoryUsage: process.memoryUsage(),
              },
              error: { message: error.message, name: error.name, stack: error.stack },
            });
          }
          next(error);
        }
      });
    }
  );

  // Patch response.render
  if (typeof exports.response.render === "function") {
    shimmer.wrap(exports.response, "render", (originalRender: Function) =>
      function patchedRender(this: ExpressResponse, view: string, options?: any, callback?: any) {
        const renderStartTime = performance.now();
        const actualOptions = typeof options === "object" ? options : undefined;
        const actualCallback = typeof options === "function" ? options : callback;

        const wrappedCallback = (err: any, html: string) => {
          const duration = parseFloat((performance.now() - renderStartTime).toFixed(2));
          const size = html ? Buffer.byteLength(html, "utf8") : 0;
          let extension = path.extname(view);
          const viewEngine = this.req?.app?.get("view engine");
          if (!extension && viewEngine) extension = "." + viewEngine;

          const viewName = !view.endsWith(extension) && extension ? view + extension : view;
          const packageType = viewEngine || "unknown";
          const logViewEnabled = process.env.NODE_OBSERVATORY_VIEWS?.includes(packageType);

          if (logViewEnabled && watchers?.view) {
            watchers.view.insertRedisStream({
              status: !err ? "completed" : "failed",
              duration,
              metadata: { package: packageType, method: "render" },
              data: {
                view: viewName,
                options: actualOptions,
                size,
                cacheInfo: { cacheEnabled: this.req?.app?.enabled("view cache") || false },
              },
              location: { file: "express", line: "0" },
              error: err ? { name: err.name, message: err.message } : undefined,
              created_at: timestamp(),
            });
          }

          if (typeof actualCallback === "function") return actualCallback(err, html);
          if (err) return this.req?.next?.(err);
          return this.send(html);
        };

        return originalRender.call(this, view, actualOptions, wrappedCallback);
      }
    );
  }

  // Patch response.send
  if (typeof exports.response.send === "function") {
    shimmer.wrap(exports.response, "send", (originalSend) =>
      function wrappedSend(this: ExpressResponse, body: any) {
        const store = requestLocalStorage.getStore();
        if (store) {
          const currentTotalBytes = store.get("totalWrittenBytes") || 0;
          if (currentTotalBytes === 0) {
            store.set("responseSizeMeasuredBySend", true);
            store.set("totalWrittenBytes", getByteLength(body, "utf8"));
          }
        }
        return originalSend.call(this, body);
      }
    );
  }

  return exports;
}

