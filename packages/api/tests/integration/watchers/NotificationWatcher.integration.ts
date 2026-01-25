/**
 * NotificationWatcher Integration Tests
 *
 * Entry structure matches ably-common.ts patcher output:
 * {
 *   status: 'completed' | 'failed',
 *   duration: number,
 *   metadata: { package: 'ably', method: string, mode: 'realtime' | 'rest' },
 *   data: { channel: string, event?: string, payload?: any, options?: any },
 *   location?: { file: string, line: string },
 *   error?: { name: string, message: string }
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

describe("NotificationWatcher Integration", () => {
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
   * Creates a notification entry in the patcher format
   */
  const createNotificationEntry = (
    uuid: string,
    data: {
      channel: string;
      event?: string;
      payload?: any;
      options?: any;
    },
    options: {
      status?: "completed" | "failed";
      duration?: number;
      method?: string;
      mode?: "realtime" | "rest";
      request_id?: string;
      job_id?: string;
      schedule_id?: string;
      error?: { name: string; message: string };
    } = {},
  ) => ({
    uuid,
    type: "notification",
    content: {
      status: options.status || "completed",
      duration: options.duration ?? 50,
      metadata: {
        package: "ably" as const,
        method: options.method || "publish",
        mode: options.mode || "realtime",
      },
      data: {
        channel: data.channel,
        event: data.event,
        payload: data.payload,
        options: data.options,
      },
      location: { file: "notifications.ts", line: "20" },
      ...(options.error && { error: options.error }),
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
      WATCHER_CONFIGS.notification,
    );
  });

  afterEach(async () => {
    watcher.stop();
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe("index endpoint", () => {
    it("should return empty results when no data exists", async () => {
      const req = createMockRequest({
        table: "true",
        index: "group",
        period: "24h",
      });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toEqual([]);
      expect(result.body.count).toBe("0");
    });

    it("should return notification entries", async () => {
      await database.insert([
        createNotificationEntry(
          "notification:1",
          {
            channel: "private-user-1",
            event: "message",
            payload: { text: "Hello" },
          },
          { duration: 50 },
        ),
        createNotificationEntry(
          "notification:2",
          {
            channel: "presence-room-1",
            event: "join",
            payload: { userId: "123" },
          },
          { duration: 30 },
        ),
      ]);

      const req = createMockRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(2);
    });

    it("should group by channel", async () => {
      await database.insert([
        createNotificationEntry(
          "notification:1",
          { channel: "private-user-1", event: "message" },
          { duration: 50 },
        ),
        createNotificationEntry(
          "notification:2",
          { channel: "private-user-1", event: "typing" },
          { duration: 30 },
        ),
      ]);

      const req = createMockRequest({
        table: "true",
        index: "group",
        period: "24h",
      });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(1);
    });

    it("should filter by status", async () => {
      await database.insert([
        createNotificationEntry(
          "notification:completed",
          { channel: "private-user-1", event: "message" },
          { status: "completed" },
        ),
        createNotificationEntry(
          "notification:failed",
          { channel: "private-user-2", event: "message" },
          {
            status: "failed",
            error: { name: "AblyError", message: "Connection lost" },
          },
        ),
      ]);

      const req = createMockRequest({
        table: "true",
        index: "instance",
        period: "24h",
        status: "failed",
      });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
    });

    it("should return graph data when isTable is false", async () => {
      const req = createMockRequest({ table: "false", period: "24h" });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty("countFormattedData");
    });
  });

  describe("view endpoint", () => {
    it("should return entry data by uuid", async () => {
      await database.insert([
        createNotificationEntry("notification:view-test", {
          channel: "private-user-1",
          event: "message",
          payload: { text: "Test" },
        }),
      ]);

      const req = createMockRequest({}, { id: "notification:view-test" });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty("notification");
    });

    it("should include related request", async () => {
      const requestId = "shared-req";
      await database.insert([
        createNotificationEntry(
          "notification:related",
          { channel: "private-user-1", event: "message" },
          { request_id: requestId },
        ),
        {
          uuid: "request:source",
          type: "request",
          content: {
            status: "completed",
            duration: 100,
            metadata: { package: "express", method: "post" },
            data: {
              route: "/api/notify",
              statusCode: 200,
              requestSize: 0,
              responseSize: 50,
            },
            location: { file: "express", line: "0" },
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

      const req = createMockRequest({}, { id: "notification:related" });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty("notification");
      expect(result.body).toHaveProperty("request");
    });
  });

  describe("insertRedisStream", () => {
    it("should add entry to Redis stream", async () => {
      const entry = {
        status: "completed" as const,
        duration: 50,
        metadata: {
          package: "ably" as const,
          method: "publish",
          mode: "realtime" as const,
        },
        data: {
          channel: "private-user-1",
          event: "message",
          payload: { text: "Hello" },
        },
        location: { file: "notifications.ts", line: "20" },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen(
        "observatory:stream:notification",
      );
      expect(streamLen).toBeGreaterThan(0);
    });

    it("should handle different methods", async () => {
      const methods = ["publish", "enter", "update", "leave"];

      for (const method of methods) {
        const entry = {
          status: "completed" as const,
          duration: 50,
          metadata: {
            package: "ably" as const,
            method,
            mode: "realtime" as const,
          },
          data: { channel: "presence-room", event: method },
          location: { file: "notifications.ts", line: "25" },
        };

        await watcher.insertRedisStream(entry as any);
      }

      const streamLen = await redisClient.xLen(
        "observatory:stream:notification",
      );
      expect(streamLen).toBe(4);
    });

    it("should handle failed notifications with error", async () => {
      const entry = {
        status: "failed" as const,
        duration: 100,
        metadata: {
          package: "ably" as const,
          method: "publish",
          mode: "realtime" as const,
        },
        data: { channel: "private-user-1", event: "message" },
        location: { file: "notifications.ts", line: "20" },
        error: { name: "AblyError", message: "Connection refused" },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen(
        "observatory:stream:notification",
      );
      expect(streamLen).toBeGreaterThan(0);
    });
  });
});
