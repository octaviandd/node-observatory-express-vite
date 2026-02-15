/**
 * ExceptionWatcher Integration Tests
 *
 * Entry structure for exceptions:
 * {
 *   status: 'failed',
 *   duration: 0,
 *   metadata: { package: 'node', type: 'uncaughtException' | 'unhandledRejection' },
 *   data: {
 *     type: 'uncaughtException' | 'unhandledRejection',
 *     message: string,
 *     stack: string,
 *     file: string,
 *     line: string,
 *     title: string
 *   },
 *   location?: { file: string, line: string }
 * }
 *
 * @format
 */

import type { RedisClientType } from "redis";
import Database from "../../../src/core/databases/sql/Base";
import GenericWatcher from "../../../src/core/watchers/GenericWatcher";
import {
  getRedisClient,
  getMySQLConnection,
  resetAll,
  registerWatcher,
} from "../test-utils";
import type { Connection } from "mysql2/promise";
import { WATCHER_CONFIGS } from "../../../src/core/watcherConfig";

describe("ExceptionWatcher Integration", () => {
  let redisClient: RedisClientType;
  let mysqlConnection: Connection;
  let database: Database;
  let watcher: GenericWatcher;

  const createMockRequest = (
    query: Record<string, string> = {},
    params: Record<string, string> = {},
  ): ObservatoryBoardRequest =>
    ({
      query,
      params,
      body: {},
      requestData: {},
    }) as unknown as ObservatoryBoardRequest;

  /**
   * Creates an exception entry in the patcher format
   */
  const createExceptionEntry = (
    uuid: string,
    data: {
      type: "uncaughtException" | "unhandledRejection";
      message: string;
      stack?: string;
      file?: string;
      line?: string;
      title?: string;
    },
    options: {
      request_id?: string;
      job_id?: string;
      schedule_id?: string;
    } = {},
  ) => ({
    uuid,
    type: "exception",
    content: {
      status: "failed" as const,
      duration: 0,
      metadata: { package: "node" as const, type: data.type },
      data: {
        type: data.type,
        message: data.message,
        stack:
          data.stack ||
          `Error: ${data.message}\n    at ${data.file || "test.js"}:${data.line || "1"}:1`,
        file: data.file || "test.js",
        line: data.line || "1",
        title: data.title || "Error",
      },
      location: { file: data.file || "test.js", line: data.line || "1" },
    },
    created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
    request_id: options.request_id || "null",
    job_id: options.job_id || "null",
    schedule_id: options.schedule_id || "null",
  });

  beforeAll(async () => {
    redisClient = await getRedisClient();
    mysqlConnection = await getMySQLConnection();
    database = new Database(mysqlConnection);
  });

  beforeEach(async () => {
    await resetAll();
    watcher = new GenericWatcher(
      redisClient as any,
      database,
      WATCHER_CONFIGS.exception,
    );
    registerWatcher(watcher);
  });

  afterEach(async () => {
    if (watcher) {
      await watcher.stop();
    }
  });

  describe("index endpoint", () => {
    it("should return empty results when no data exists", async () => {
      const req = createMockRequest({
        table: "true",
        index: "group",
        period: "24h",
      });
      const result = await watcher.indexTable(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toEqual([]);
      expect(result.body.count).toBe("0");
    });

    it("should return exception entries", async () => {
      await database.insert([
        createExceptionEntry("exception:1", {
          type: "uncaughtException",
          message: "Test error 1",
          file: "test.js",
          line: "1",
        }),
        createExceptionEntry("exception:2", {
          type: "unhandledRejection",
          message: "Test error 2",
          file: "test.js",
          line: "2",
        }),
      ]);

      const req = createMockRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });
      const result = await watcher.indexTable(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(2);
    });

    it("should group exceptions by error message", async () => {
      await database.insert([
        createExceptionEntry("exception:1", {
          type: "uncaughtException",
          message: "Same error",
        }),
        createExceptionEntry("exception:2", {
          type: "uncaughtException",
          message: "Same error",
        }),
      ]);

      const req = createMockRequest({
        table: "true",
        index: "group",
        period: "24h",
      });
      const result = await watcher.indexTable(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(1);
    });

    it("should filter by exception type", async () => {
      await database.insert([
        createExceptionEntry("exception:uncaught", {
          type: "uncaughtException",
          message: "Uncaught error",
        }),
        createExceptionEntry("exception:unhandled", {
          type: "unhandledRejection",
          message: "Unhandled rejection",
        }),
      ]);

      const req = createMockRequest({
        table: "true",
        index: "instance",
        period: "24h",
        status: "uncaughtException",
      });
      const result = await watcher.indexTable(req);

      expect(result.statusCode).toBe(200);
    });

    it("should return graph data when isTable is false", async () => {
      const req = createMockRequest({ table: "false", period: "24h" });
      const result = await watcher.indexGraph(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty("countFormattedData");
    });
  });

  describe("view endpoint", () => {
    it("should return entry data by uuid", async () => {
      await database.insert([
        createExceptionEntry("exception:view-test", {
          type: "uncaughtException",
          message: "Test error",
        }),
      ]);

      const req = createMockRequest({}, { id: "exception:view-test" });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty("exception");
    });

    it("should include related request when request_id exists", async () => {
      const requestId = "request-with-error";
      await database.insert([
        createExceptionEntry(
          "exception:related",
          {
            type: "uncaughtException",
            message: "Error in request",
            file: "handler.js",
            line: "10",
          },
          { request_id: requestId },
        ),
        {
          uuid: "request:source",
          type: "request",
          content: {
            status: "failed",
            duration: 100,
            metadata: { package: "express", method: "get" },
            data: {
              route: "/api/users",
              statusCode: 500,
              requestSize: 0,
              responseSize: 0,
            },
            location: { file: "express", line: "0" },
            error: { name: "Error", message: "Error in request" },
          },
          created_at: new Date()
            .toISOString()
            .replace("T", " ")
            .substring(0, 19),
          request_id: requestId,
          job_id: "null",
          schedule_id: "null",
        },
      ]);

      const req = createMockRequest({}, { id: "exception:related" });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty("exception");
      expect(result.body).toHaveProperty("request");
    });

    it("should include related job when job_id exists", async () => {
      const jobId = "job-with-error";
      await database.insert([
        createExceptionEntry(
          "exception:job-related",
          { type: "uncaughtException", message: "Error in job" },
          { job_id: jobId },
        ),
        {
          uuid: "job:source",
          type: "job",
          content: {
            status: "failed",
            duration: 100,
            metadata: {
              package: "bull",
              method: "processJob",
              queue: "email",
              connectionName: "localhost:6379",
            },
            data: { jobId, attemptsMade: 1, failedReason: "Error in job" },
            location: { file: "jobs.ts", line: "30" },
            error: { name: "BullError", message: "Error in job" },
          },
          created_at: new Date()
            .toISOString()
            .replace("T", " ")
            .substring(0, 19),
          request_id: "null",
          job_id: jobId,
          schedule_id: "null",
        },
      ]);

      const req = createMockRequest({}, { id: "exception:job-related" });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty("exception");
      expect(result.body).toHaveProperty("job");
    });
  });

  describe("insertRedisStream", () => {
    it("should add entry to Redis stream", async () => {
      const entry = {
        status: "failed" as const,
        duration: 0,
        metadata: { package: "node" as const, type: "uncaughtException" },
        data: {
          type: "uncaughtException",
          message: "Test error",
          stack: "Error: Test error\n    at test.js:1:1",
          file: "test.js",
          line: "1",
          title: "Error",
        },
        location: { file: "test.js", line: "1" },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen("observatory:stream:exception");
      expect(streamLen).toBeGreaterThan(0);
    });

    it("should handle unhandled rejections", async () => {
      const entry = {
        status: "failed" as const,
        duration: 0,
        metadata: { package: "node" as const, type: "unhandledRejection" },
        data: {
          type: "unhandledRejection",
          message: "Promise rejected",
          stack: "Error: Promise rejected\n    at async.js:15:1",
          file: "async.js",
          line: "15",
          title: "Error",
        },
        location: { file: "async.js", line: "15" },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen("observatory:stream:exception");
      expect(streamLen).toBeGreaterThan(0);
    });
  });
});
