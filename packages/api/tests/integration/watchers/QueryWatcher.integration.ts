/**
 * QueryWatcher Integration Tests
 *
 * Comprehensive tests for query monitoring including:
 * - Duration statistics and calculations
 * - Package-specific handling (MySQL2, PostgreSQL, etc.)
 * - SQL query edge cases
 * - Error handling
 * - Pagination and filtering
 * - Concurrent operations
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

describe("QueryWatcher Integration Tests", () => {
  let redisClient: RedisClientType;
  let mysqlConnection: Connection;
  let database: Database;
  let watcher: GenericWatcher<"query">;

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
   * Creates a query entry matching the BaseLogEntry format
   * This is what the patchers actually send to insertRedisStream
   */
  const createQueryLogEntry = (
    data: {
      sql: string;
      params?: any; // Fixed: Changed from values to params to match QueryContent
      hostname?: string;
      port?: string;
      database?: string;
      sqlType?: string;
    },
    options: {
      status?: "completed" | "failed";
      duration?: number;
      package?:
        | "mysql2"
        | "pg"
        | "sequelize"
        | "knex"
        | "prisma"
        | "sqlite3"
        | "typeorm";
      error?: { name: string; message: string; stack?: string };
      file?: string;
      line?: string;
    } = {},
  ) => ({
    status: options.status || "completed",
    duration: options.duration ?? 50,
    metadata: {
      package: options.package || "mysql2",
    },
    data: {
      sql: data.sql,
      params: data.params, // Fixed: params not values
      hostname: data.hostname || "localhost",
      port: data.port || "3306",
      database: data.database || "test_db",
      sqlType: data.sqlType || "SELECT",
      context: "query", // Added: Required field
    },
    location: {
      file: options.file || "db.ts",
      line: options.line || "15",
    },
    ...(options.error && { error: options.error }),
  });

  /**
   * Creates a database entry (what gets stored in MySQL)
   * Matches the WatcherEntry interface and QueryContent structure
   */
  const createQueryEntry = (
    uuid: string,
    data: {
      sql: string;
      params?: any;
      hostname?: string;
      port?: string;
      database?: string;
      sqlType?: string;
      context?: string;
    },
    options: {
      status?: "completed" | "failed";
      duration?: number;
      package?:
        | "mysql2"
        | "pg"
        | "sequelize"
        | "knex"
        | "prisma"
        | "sqlite3"
        | "typeorm";
      request_id?: string;
      job_id?: string;
      schedule_id?: string;
      error?: { name: string; message: string };
      file?: string;
      line?: string;
    } = {},
  ): WatcherEntry => ({
    uuid,
    type: "query",
    content: {
      type: "query", // Added: Required field
      sql: data.sql,
      params: data.params,
      hostname: data.hostname || "localhost",
      port: data.port || "3306",
      database: data.database || "test_db",
      sqlType: data.sqlType || "SELECT",
      context: data.context || "query",
      status: options.status || "completed",
      package: options.package || "mysql2",
      file: options.file || "db.ts",
      line: options.line || "15",
      duration: options.duration,
      error: options.error || null,
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
    watcher = new GenericWatcher<"query">(
      redisClient as any,
      database,
      WATCHER_CONFIGS.query,
    );
    registerWatcher(watcher);
  });

  afterEach(() => {
    watcher.stop();
  });

  // ========== BASIC FUNCTIONALITY ==========

  describe("Basic Query Operations", () => {
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

    it("should return query entries", async () => {
      await database.insert([
        createQueryEntry(
          "query:1",
          {
            sql: "SELECT * FROM users WHERE id = ?",
            params: [1],
          },
          { duration: 50, request_id: "req-1" },
        ),
        createQueryEntry(
          "query:2",
          {
            sql: "INSERT INTO logs VALUES (?)",
            params: ["test"],
            sqlType: "INSERT",
          },
          { duration: 30, request_id: "req-2" },
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

      const firstResult = result.body.results[0];
      expect(firstResult.content.type).toBe("query");
      expect(firstResult.content.sql).toBeDefined();
      expect(firstResult.content.hostname).toBeDefined();
      expect(firstResult.content.port).toBeDefined();
      expect(firstResult.content.database).toBeDefined();
      expect(firstResult.content.status).toBeDefined();
      expect(firstResult.content.package).toBeDefined();
    });

    it("should group queries by SQL pattern", async () => {
      await database.insert([
        createQueryEntry(
          "query:1",
          { sql: "SELECT * FROM users" },
          { duration: 50 },
        ),
        createQueryEntry(
          "query:2",
          { sql: "SELECT * FROM users" },
          { duration: 60 },
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

      // Verify QueryGroupResponse structure
      const groupResult = result.body.results[0];
      expect(groupResult.endpoint).toBeDefined();
      expect(groupResult.completed).toBeDefined();
      expect(groupResult.failed).toBeDefined();
      expect(groupResult.average).toBeDefined();
      expect(groupResult.p95).toBeDefined();
      expect(groupResult.count).toBeDefined();
    });
  });

  // ========== DURATION STATISTICS ==========

  describe("Duration Statistics and Calculations", () => {
    beforeEach(async () => {
      await database.insert([
        createQueryEntry(
          "query:fast-1",
          { sql: "SELECT COUNT(*) FROM users", sqlType: "SELECT" },
          { duration: 5.25 },
        ),
        createQueryEntry(
          "query:medium-1",
          { sql: "SELECT * FROM orders WHERE user_id = 123" },
          { duration: 50.75 },
        ),
        createQueryEntry(
          "query:slow-1",
          { sql: "SELECT * FROM large_table JOIN another_table..." },
          { duration: 250.5 },
        ),
      ]);
    });

    it("should calculate duration statistics correctly", async () => {
      const req = createMockRequest({ table: "false", period: "24h" });
      const result = await watcher.indexGraph(req);

      expect(result.statusCode).toBe(200);

      // Verify GraphDataResponse structure
      const graphData = result.body;
      expect(graphData.shortest).toBeDefined();
      expect(graphData.longest).toBeDefined();
      expect(graphData.average).toBeDefined();
      expect(graphData.p95).toBeDefined();
      expect(graphData.countFormattedData).toBeDefined();
      expect(graphData.durationFormattedData).toBeDefined();

      const shortest = parseFloat(graphData.shortest);
      const longest = parseFloat(graphData.longest);
      const average = parseFloat(graphData.average);

      expect(shortest).toBeLessThan(average);
      expect(average).toBeLessThan(longest);
    });

    it("should handle zero-duration queries", async () => {
      await database.insert([
        createQueryEntry("query:instant", { sql: "SELECT 1" }, { duration: 0 }),
      ]);

      const req = createMockRequest({ table: "false", period: "24h" });
      const result = await watcher.indexGraph(req);

      expect(result.statusCode).toBe(200);
      // expect(parseFloat(result.body.results)).toBe(0);
    });

    it("should handle very large duration values", async () => {
      await database.insert([
        createQueryEntry(
          "query:very-slow",
          { sql: "SELECT * FROM huge_table_with_no_index" },
          { duration: 999999.99 },
        ),
      ]);

      const req = createMockRequest({
        table: "false",
        index: "instance",
        period: "24h",
      });
      const result = await watcher.indexGraph(req);

      expect(result.statusCode).toBe(200);
      expect(parseFloat(result.body.longest)).toBeGreaterThan(999000);
    });
  });

  // ========== PACKAGE-SPECIFIC HANDLING ==========

  describe("Database Package Handling", () => {
    it("should handle different database packages", async () => {
      const packages = [
        "mysql2",
        "pg",
        "sequelize",
        "knex",
        "prisma",
      ] as const;

      await database.insert(
        packages.map((pkg, i) =>
          createQueryEntry(
            `query:${pkg}-${i}`,
            { sql: "SELECT * FROM users" },
            { package: pkg, duration: 50 + i * 10 },
          ),
        ),
      );

      const req = createMockRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });
      const result = await watcher.indexTable(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(packages.length);

      // Verify all packages are present
      const returnedPackages = result.body.results.map(
        (r: QueryInstanceResponse) => r.content.metadata.package,
      );
      packages.forEach((pkg) => {
        expect(returnedPackages).toContain(pkg);
      });
    });
  });

  // ========== SQL EDGE CASES ==========

  describe("SQL Query Handling", () => {
    it("should handle very long SQL queries", async () => {
      const longSql =
        "SELECT * FROM table WHERE " + Array(1000).fill("(1=1 AND)").join("");

      await database.insert([
        createQueryEntry("query:long-sql", { sql: longSql }, { duration: 75 }),
      ]);

      const req = createMockRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });
      const result = await watcher.indexTable(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results[0].content.sql).toBeDefined();
    });

    it("should handle multiline SQL queries", async () => {
      const multilineSql = `
        SELECT u.id, u.name, COUNT(p.id) as post_count
        FROM users u
        LEFT JOIN posts p ON u.id = p.user_id
        WHERE u.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY u.id, u.name
        HAVING post_count > 5
        ORDER BY post_count DESC
        LIMIT 100
      `;

      await database.insert([
        createQueryEntry(
          "query:multiline",
          { sql: multilineSql, sqlType: "SELECT" },
          { duration: 150 },
        ),
      ]);

      const req = createMockRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });
      const result = await watcher.indexTable(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results[0].content.sql).toContain("SELECT");
    });

    it("should handle parameterized queries", async () => {
      await database.insert([
        createQueryEntry(
          "query:param-1",
          {
            sql: "SELECT * FROM users WHERE id = ? AND status = ?",
            params: { values: ["123", "active"] }, // Fixed: proper params structure
          },
          { duration: 50 },
        ),
        createQueryEntry(
          "query:param-2",
          {
            sql: "SELECT * FROM posts WHERE user_id IN (?, ?, ?)",
            params: { values: ["1", "2", "3"] },
          },
          { duration: 60 },
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
      expect(result.body.results[0].content.params).toBeDefined();
    });
  });

  // ========== ERROR HANDLING ==========

  describe("Query Error Scenarios", () => {
    it("should track failed queries with errors", async () => {
      await database.insert([
        createQueryEntry(
          "query:syntax-error",
          { sql: "SELCT * FROM users" }, // Typo
          {
            status: "failed",
            duration: 5,
            error: {
              name: "QuerySyntaxError",
              message: "You have an error in your SQL syntax",
            },
          },
        ),
      ]);

      const req = createMockRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });
      const result = await watcher.indexTable(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results[0].content.status).toBe("failed");
      expect(result.body.results[0].content.error).toBeDefined();
      expect(result.body.results[0].content.error?.message).toContain("syntax");
    });

    it("should handle connection errors", async () => {
      await database.insert([
        createQueryEntry(
          "query:connection-error",
          { sql: "SELECT 1" },
          {
            status: "failed",
            duration: 30000,
            error: {
              name: "ConnectionError",
              message: "Connection lost: The server closed the connection.",
            },
          },
        ),
      ]);

      const req = createMockRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });
      const result = await watcher.indexTable(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results[0].content.error?.name).toBe(
        "ConnectionError",
      );
    });
  });

  // ========== VIEW ENDPOINT ==========

  describe("View Endpoint", () => {
    it("should return entry data by uuid", async () => {
      await database.insert([
        createQueryEntry(
          "query:view-test",
          { sql: "SELECT * FROM users" },
          { duration: 50 },
        ),
      ]);

      const req = createMockRequest({}, { id: "query:view-test" });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);

      // Verify ViewDataResponse structure
      const viewData = result.body as ViewDataResponse;
      expect(viewData.query).toBeDefined();
      expect(Array.isArray(viewData.query)).toBe(true);

      if (viewData.query && viewData.query.length > 0) {
        const firstEntry = viewData.query[0];
        expect(firstEntry.uuid).toBeDefined();
        expect(firstEntry.content).toBeDefined();
        expect(firstEntry.type).toBe("query");
      }
    });

    it("should include related request", async () => {
      const requestId = "shared-request";
      await database.insert([
        createQueryEntry(
          "query:related",
          { sql: "SELECT * FROM users" },
          { duration: 50, request_id: requestId },
        ),
        {
          uuid: "request:source",
          type: "request",
          content: {
            type: "request",
            method: "GET",
            route: "/api/users",
            statusCode: 200,
            duration: 100,
            headers: {},
            query: {},
            params: {},
            ip: "127.0.0.1",
            payload: null,
            responseSize: 100,
            requestSize: 0,
            session: {},
            memoryUsage: {
              rss: 0,
              heapTotal: 0,
              heapUsed: 0,
              external: 0,
            },
            package: "express",
            file: "express",
            line: "0",
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

      const req = createMockRequest({}, { id: "query:related" });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.query).toBeDefined();
      expect(result.body.request).toBeDefined();
    });
  });

  // ========== REDIS STREAM INSERTION ==========

  describe("insertRedisStream", () => {
    it("should add entry to Redis stream", async () => {
      const entry = createQueryLogEntry(
        {
          sql: "SELECT * FROM users",
          params: [],
          database: "test_db",
        },
        { duration: 50 },
      );

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen("observatory:stream:query");
      expect(streamLen).toBeGreaterThan(0);
    });

    it("should handle failed queries in stream", async () => {
      const entry = createQueryLogEntry(
        {
          sql: "SELECT * FROM nonexistent",
          database: "test_db",
        },
        {
          status: "failed",
          duration: 10,
          error: {
            name: "QueryError",
            message: "Table 'nonexistent' doesn't exist",
            stack: "Error...",
          },
        },
      );

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen("observatory:stream:query");
      expect(streamLen).toBeGreaterThan(0);
    });
  });

  // ----- Edge-case suite -----
  addEdgeCaseTests(
    {
      watcherType: "query",
      entryType: "query",
      packageName: "mysql2",
      graphMetrics: ["completed", "failed"],
      createEntry: (uuid: string) =>
        createQueryEntry(uuid, { sql: `SELECT * FROM test_${uuid}` }),
    },
    () => watcher,
    () => database,
  );
});
