/**
 * ScheduleWatcher Integration Tests
 *
 * Entry structure for scheduled tasks:
 * {
 *   status: 'completed' | 'failed',
 *   duration: number,
 *   metadata: { package: 'node-cron' | 'agenda', type: string },
 *   data: {
 *     scheduleId: string,
 *     cronExpression?: string,
 *     type?: string
 *   },
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
import { addEdgeCaseTests } from "../edge-cases/edgeCaseSuite";

describe("ScheduleWatcher Integration", () => {
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
   * Creates a schedule entry in the patcher format
   */
  const createScheduleEntry = (
    uuid: string,
    data: {
      scheduleId: string;
      cronExpression?: string;
      type?: string;
    },
    options: {
      status?: "completed" | "failed";
      duration?: number;
      package?: "node-cron" | "agenda";
      request_id?: string;
      job_id?: string;
      schedule_id?: string;
      error?: { name: string; message: string };
    } = {},
  ) => ({
    uuid,
    type: "schedule",
    content: {
      status: options.status || "completed",
      duration: options.duration ?? 5000,
      metadata: {
        package: options.package || "node-cron",
        type: data.type || "processJob",
      },
      data: {
        scheduleId: data.scheduleId,
        cronExpression: data.cronExpression,
        type: data.type || "processJob",
      },
      location: { file: "scheduler.ts", line: "30" },
      ...(options.error && { error: options.error }),
    },
    created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
    request_id: options.request_id || "null",
    job_id: options.job_id || "null",
    schedule_id: options.schedule_id || data.scheduleId,
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
      WATCHER_CONFIGS.schedule,
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
      const result = await watcher.indexTable(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toEqual([]);
      expect(result.body.count).toBe("0");
    });

    it("should return schedule entries", async () => {
      await database.insert([
        createScheduleEntry(
          "schedule:1",
          {
            scheduleId: "daily-backup",
            cronExpression: "0 0 * * *",
            type: "processJob",
          },
          { duration: 5000, schedule_id: "daily-backup" },
        ),
        createScheduleEntry(
          "schedule:2",
          {
            scheduleId: "hourly-cleanup",
            cronExpression: "0 * * * *",
            type: "processJob",
          },
          { duration: 1000, schedule_id: "hourly-cleanup" },
        ),
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

    it("should group by schedule ID", async () => {
      await database.insert([
        createScheduleEntry(
          "schedule:1",
          {
            scheduleId: "daily-backup",
            cronExpression: "0 0 * * *",
            type: "processJob",
          },
          { duration: 5000 },
        ),
        createScheduleEntry(
          "schedule:2",
          {
            scheduleId: "daily-backup",
            cronExpression: "0 0 * * *",
            type: "processJob",
          },
          { duration: 4500 },
        ),
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

    it("should filter by status", async () => {
      await database.insert([
        createScheduleEntry(
          "schedule:completed",
          {
            scheduleId: "task-1",
            cronExpression: "* * * * *",
            type: "processJob",
          },
          { status: "completed" },
        ),
        createScheduleEntry(
          "schedule:failed",
          {
            scheduleId: "task-2",
            cronExpression: "* * * * *",
            type: "processJob",
          },
          {
            status: "failed",
            error: { name: "Error", message: "Task failed" },
          },
        ),
      ]);

      const req = createMockRequest({
        table: "true",
        index: "instance",
        period: "24h",
        status: "failed",
      });
      const result = await watcher.indexGraph(req);

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
        createScheduleEntry(
          "schedule:view-test",
          {
            scheduleId: "daily-backup",
            cronExpression: "0 0 * * *",
            type: "processJob",
          },
          { schedule_id: "daily-backup" },
        ),
      ]);

      const req = createMockRequest({}, { id: "schedule:view-test" });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty("schedule");
    });

    it("should include related entries", async () => {
      const scheduleId = "shared-schedule";
      await database.insert([
        createScheduleEntry(
          "schedule:main",
          { scheduleId, cronExpression: "0 0 * * *", type: "processJob" },
          { schedule_id: scheduleId },
        ),
        {
          uuid: "log:related",
          type: "log",
          content: {
            status: "completed",
            duration: 0,
            metadata: { package: "winston", level: "info" },
            data: { message: "Schedule started" },
            location: { file: "scheduler.ts", line: "35" },
          },
          created_at: new Date()
            .toISOString()
            .replace("T", " ")
            .substring(0, 19),
          request_id: "null",
          job_id: "null",
          schedule_id: scheduleId,
        },
      ]);

      const req = createMockRequest({}, { id: "schedule:main" });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty("schedule");
      expect(result.body).toHaveProperty("log");
    });
  });

  describe("insertRedisStream", () => {
    it("should add entry to Redis stream", async () => {
      const entry = {
        status: "completed" as const,
        duration: 5000,
        metadata: { package: "node-cron" as const, type: "processJob" },
        data: {
          scheduleId: "daily-backup",
          cronExpression: "0 0 * * *",
          type: "processJob",
        },
        location: { file: "scheduler.ts", line: "30" },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen("observatory:stream:schedule");
      expect(streamLen).toBeGreaterThan(0);
    });

    it("should handle failed schedules with error", async () => {
      const entry = {
        status: "failed" as const,
        duration: 100,
        metadata: { package: "node-cron" as const, type: "processJob" },
        data: {
          scheduleId: "failing-task",
          cronExpression: "* * * * *",
          type: "processJob",
        },
        location: { file: "scheduler.ts", line: "30" },
        error: { name: "ScheduleError", message: "Task execution failed" },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen("observatory:stream:schedule");
      expect(streamLen).toBeGreaterThan(0);
    });
  });

  // ----- Edge-case suite -----
  addEdgeCaseTests(
    {
      watcherType: "schedule",
      entryType: "schedule",
      packageName: "node-cron",
      graphMetrics: ["completed", "failed"],
      createEntry: (uuid: string) =>
        createScheduleEntry(uuid, { scheduleId: `sched-${uuid}`, cronExpression: "0 0 * * *" }),
    },
    () => watcher,
    () => database,
  );
});
