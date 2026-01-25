/**
 * QueryWatcher Edge Cases Integration Tests
 *
 * Template example showing how to apply the generalized testing framework
 * to a duration-based watcher with package-specific variants.
 *
 * This file demonstrates:
 * - Using duration-based watcher edge case template
 * - Package-specific testing (MySQL2 vs PostgreSQL)
 * - SQL parameter handling
 * - Query execution statistics
 * - Database-specific edge cases
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
import {
  createBaseEntry,
  createFilterRequest,
  testPaginationBoundaries,
  createOversizedEntry,
  createSpecialCharacterEntry,
  testConcurrentInsertions,
  assertEntryStructure,
  getTimestamp,
} from "../edge-cases/testHelpers";

describe("QueryWatcher Edge Cases Integration", () => {
  let redisClient: RedisClientType;
  let mysqlConnection: Connection;
  let database: Database;
  let watcher: GenericWatcher;

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
      WATCHER_CONFIGS.query,
    );
    registerWatcher(watcher);
  });

  afterEach(async () => {
    await watcher.stop();
  });

  // ========== DURATION-BASED WATCHER TESTS ==========
  // Using durationWatcherEdgeCaseTemplate pattern

  describe("Duration Statistics and Calculations", () => {
    beforeEach(async () => {
      // Insert queries with varied durations
      const entries = [
        createBaseEntry("query:fast-1", "query", "mysql2", {
          content: {
            status: "completed",
            duration: 5.25,
            metadata: { package: "mysql2", method: "query" },
            data: {
              sql: "SELECT COUNT(*) FROM users",
              rows_affected: 1,
              rows_returned: 1,
            },
          },
        }),
        createBaseEntry("query:medium-1", "query", "mysql2", {
          content: {
            status: "completed",
            duration: 50.75,
            metadata: { package: "mysql2", method: "query" },
            data: {
              sql: "SELECT * FROM orders WHERE user_id = 123",
              rows_affected: 0,
              rows_returned: 15,
            },
          },
        }),
        createBaseEntry("query:slow-1", "query", "mysql2", {
          content: {
            status: "completed",
            duration: 250.5,
            metadata: { package: "mysql2", method: "query" },
            data: {
              sql: "SELECT * FROM large_table JOIN another_table...",
              rows_affected: 0,
              rows_returned: 10000,
            },
          },
        }),
      ];

      await database.insert(entries);
    });

    it("should calculate duration statistics correctly", async () => {
      const req = createFilterRequest({
        table: "false", // Graph mode for statistics
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty("shortest");
      expect(result.body).toHaveProperty("longest");
      expect(result.body).toHaveProperty("average");
      expect(result.body).toHaveProperty("p95");

      // Verify values are reasonable
      const shortest = parseFloat(result.body.shortest);
      const longest = parseFloat(result.body.longest);
      const average = parseFloat(result.body.average);

      expect(shortest).toBeLessThan(average);
      expect(average).toBeLessThan(longest);
    });

    it("should handle decimal precision in duration calculations", async () => {
      const req = createFilterRequest({
        table: "false",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      // Durations should maintain at least 2 decimal places
      const shortest = parseFloat(result.body.shortest);
      expect(Number.isFinite(shortest)).toBe(true);
    });

    it("should calculate P95 correctly for query duration distribution", async () => {
      // Insert 100 queries with graduated durations
      const entries = Array.from({ length: 100 }, (_, i) =>
        createBaseEntry(`query:p95-${i}`, "query", "mysql2", {
          content: {
            status: "completed",
            duration: (i + 1) * 2.5, // 2.5 to 250ms
            metadata: { package: "mysql2", method: "query" },
            data: {
              sql: `SELECT * FROM table_${i}`,
              rows_affected: 0,
              rows_returned: i * 10,
            },
          },
        }),
      );

      await database.insert(entries);

      const req = createFilterRequest({
        table: "false",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      // P95 of 1-100 should be around 95
      const p95 = parseFloat(result.body.p95);
      expect(p95).toBeGreaterThan(200); // ~237.5 for this dataset
      expect(p95).toBeLessThanOrEqual(250);
    });

    it("should handle zero-duration queries", async () => {
      const entry = createBaseEntry("query:instant", "query", "mysql2", {
        content: {
          status: "completed",
          duration: 0,
          metadata: { package: "mysql2", method: "query" },
          data: {
            sql: "SELECT 1",
            rows_affected: 0,
            rows_returned: 1,
          },
        },
      });

      await database.insert([entry]);

      const req = createFilterRequest({
        table: "false",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(parseFloat(result.body.shortest)).toBe(0);
    });

    it("should handle very large duration values (slow queries)", async () => {
      const entry = createBaseEntry("query:very-slow", "query", "mysql2", {
        content: {
          status: "completed",
          duration: 999999.99, // ~277 hours
          metadata: { package: "mysql2", method: "query" },
          data: {
            sql: "SELECT * FROM huge_table_with_no_index",
            rows_affected: 0,
            rows_returned: 1000000,
          },
        },
      });

      await database.insert([entry]);

      const req = createFilterRequest({
        table: "false",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(parseFloat(result.body.longest)).toBeGreaterThan(999000);
    });

    it("should handle failed queries with error duration", async () => {
      const entry = createBaseEntry("query:timeout", "query", "mysql2", {
        content: {
          status: "failed",
          duration: 30000, // 30 second timeout
          metadata: { package: "mysql2", method: "query" },
          data: {
            sql: "SELECT * FROM huge_table",
            rows_affected: 0,
            rows_returned: 0,
          },
          error: {
            name: "QueryTimeoutError",
            message: "Query exceeded timeout of 30s",
          },
        },
      });

      await database.insert([entry]);

      const req = createFilterRequest({
        table: "false",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
    });
  });

  // ========== PACKAGE-SPECIFIC WATCHER TESTS ==========
  // Using packageWatcherEdgeCaseTemplate pattern

  describe("Database Package Handling", () => {
    it("should identify and differentiate MySQL2 vs PostgreSQL", async () => {
      const entries = [
        createBaseEntry("query:mysql-1", "query", "mysql2", {
          content: {
            status: "completed",
            duration: 50,
            metadata: { package: "mysql2", method: "query" },
            data: {
              sql: "SELECT * FROM users",
              database: "mysql",
              rows_returned: 10,
            },
          },
        }),
        createBaseEntry("query:mysql-2", "query", "mysql2", {
          content: {
            status: "completed",
            duration: 60,
            metadata: { package: "mysql2", method: "query" },
            data: {
              sql: "SELECT * FROM posts",
              database: "mysql",
              rows_returned: 25,
            },
          },
        }),
        createBaseEntry("query:pg-1", "query", "pg", {
          content: {
            status: "completed",
            duration: 45,
            metadata: { package: "pg", method: "query" },
            data: {
              sql: "SELECT * FROM users",
              database: "postgresql",
              rows_returned: 10,
            },
          },
        }),
      ];

      await database.insert(entries);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(3);

      // Verify packages are correctly identified
      const packages = result.body.results.map(
        (r: any) => r.content.metadata.package,
      );
      expect(packages.filter((p: string) => p === "mysql2")).toHaveLength(2);
      expect(packages.filter((p: string) => p === "pg")).toHaveLength(1);
    });

    it("should group MySQL and PostgreSQL queries separately", async () => {
      const entries = [
        createBaseEntry("query:mysql-a", "query", "mysql2", {
          content: {
            status: "completed",
            duration: 50,
            metadata: { package: "mysql2", method: "query" },
            data: { sql: "SELECT * FROM users", rows_returned: 10 },
          },
        }),
        createBaseEntry("query:mysql-b", "query", "mysql2", {
          content: {
            status: "completed",
            duration: 55,
            metadata: { package: "mysql2", method: "query" },
            data: { sql: "SELECT * FROM users", rows_returned: 10 },
          },
        }),
        createBaseEntry("query:pg-a", "query", "pg", {
          content: {
            status: "completed",
            duration: 48,
            metadata: { package: "pg", method: "query" },
            data: { sql: "SELECT * FROM users", rows_returned: 10 },
          },
        }),
      ];

      await database.insert(entries);

      const req = createFilterRequest({
        table: "true",
        index: "group",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      // Should be grouped by both package and SQL
      expect(result.body.results.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle unknown/unsupported database packages", async () => {
      const entry = createBaseEntry(
        "query:unknown-db",
        "query",
        "unknown-orm",
        {
          content: {
            status: "completed",
            duration: 100,
            metadata: { package: "some-unknown-orm", method: "query" },
            data: {
              sql: "SELECT * FROM data",
              rows_returned: 5,
            },
          },
        },
      );

      await database.insert([entry]);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(1);
    });
  });

  // ========== SQL-SPECIFIC EDGE CASES ==========

  describe("SQL Query Handling", () => {
    it("should handle very long SQL queries", async () => {
      const longSql =
        "SELECT * FROM table WHERE " + Array(1000).fill("(1=1 AND)").join("");
      const entry = createBaseEntry("query:long-sql", "query", "mysql2", {
        content: {
          status: "completed",
          duration: 75,
          metadata: { package: "mysql2", method: "query" },
          data: {
            sql: longSql,
            rows_affected: 0,
            rows_returned: 0,
          },
        },
      });

      await database.insert([entry]);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results[0].content.data.sql).toBeDefined();
    });

    it("should handle SQL with special characters", async () => {
      const entries = [
        createBaseEntry("query:special-1", "query", "mysql2", {
          content: {
            status: "completed",
            duration: 50,
            metadata: { package: "mysql2", method: "query" },
            data: {
              sql: `SELECT * FROM users WHERE name = '☃️ Snowman'`,
              rows_returned: 1,
            },
          },
        }),
        createBaseEntry("query:special-2", "query", "mysql2", {
          content: {
            status: "completed",
            duration: 50,
            metadata: { package: "mysql2", method: "query" },
            data: {
              sql: `SELECT * FROM users WHERE comment LIKE '%<script>%'`,
              rows_returned: 0,
            },
          },
        }),
      ];

      await database.insert(entries);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(2);
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

      const entry = createBaseEntry("query:multiline", "query", "mysql2", {
        content: {
          status: "completed",
          duration: 150,
          metadata: { package: "mysql2", method: "query" },
          data: {
            sql: multilineSql,
            rows_affected: 0,
            rows_returned: 50,
          },
        },
      });

      await database.insert([entry]);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results[0].content.data.sql).toContain("SELECT");
    });

    it("should handle parameterized queries", async () => {
      const entries = [
        createBaseEntry("query:param-1", "query", "mysql2", {
          content: {
            status: "completed",
            duration: 50,
            metadata: { package: "mysql2", method: "query" },
            data: {
              sql: "SELECT * FROM users WHERE id = ? AND status = ?",
              params: ["123", "active"],
              rows_returned: 1,
            },
          },
        }),
        createBaseEntry("query:param-2", "query", "mysql2", {
          content: {
            status: "completed",
            duration: 60,
            metadata: { package: "mysql2", method: "query" },
            data: {
              sql: "SELECT * FROM posts WHERE user_id IN (?, ?, ?)",
              params: ["1", "2", "3"],
              rows_returned: 5,
            },
          },
        }),
      ];

      await database.insert(entries);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(2);
    });
  });

  // ========== PAGINATION AND FILTERING TESTS ==========

  describe("Pagination Boundary Conditions", () => {
    beforeEach(async () => {
      const entries = Array.from({ length: 30 }, (_, i) =>
        createBaseEntry(`query:pagination-${i}`, "query", "mysql2", {
          content: {
            status: i % 5 === 0 ? "failed" : "completed",
            duration: 50 + i * 5,
            metadata: { package: "mysql2", method: "query" },
            data: {
              sql: `SELECT * FROM table_${i}`,
              rows_returned: i * 10,
            },
          },
        }),
      );

      await database.insert(entries);
    });

    it("should handle pagination boundaries correctly", async () => {
      await testPaginationBoundaries(watcher, database, [], "query");
    });

    it("should return exact number of results with limit", async () => {
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        offset: "0",
        limit: "10",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(10);
      expect(result.body.count).toBe("30");
    });
  });

  // ========== ROWS AFFECTED/RETURNED TRACKING ==========

  describe("Query Result Metrics", () => {
    it("should track rows affected vs rows returned separately", async () => {
      const entries = [
        createBaseEntry("query:select", "query", "mysql2", {
          content: {
            status: "completed",
            duration: 50,
            metadata: { package: "mysql2", method: "query" },
            data: {
              sql: "SELECT * FROM users",
              rows_affected: 0, // SELECT doesn't affect rows
              rows_returned: 100,
            },
          },
        }),
        createBaseEntry("query:insert", "query", "mysql2", {
          content: {
            status: "completed",
            duration: 30,
            metadata: { package: "mysql2", method: "query" },
            data: {
              sql: "INSERT INTO logs VALUES (...)",
              rows_affected: 1,
              rows_returned: 0, // INSERT doesn't return rows
            },
          },
        }),
        createBaseEntry("query:update", "query", "mysql2", {
          content: {
            status: "completed",
            duration: 40,
            metadata: { package: "mysql2", method: "query" },
            data: {
              sql: "UPDATE users SET status = ? WHERE id = ?",
              rows_affected: 5,
              rows_returned: 0,
            },
          },
        }),
      ];

      await database.insert(entries);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(3);
    });

    it("should handle zero rows affected/returned", async () => {
      const entry = createBaseEntry("query:no-match", "query", "mysql2", {
        content: {
          status: "completed",
          duration: 20,
          metadata: { package: "mysql2", method: "query" },
          data: {
            sql: "SELECT * FROM users WHERE id = 999999999",
            rows_affected: 0,
            rows_returned: 0,
          },
        },
      });

      await database.insert([entry]);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results[0].content.data.rows_returned).toBe(0);
    });

    it("should handle very large row counts", async () => {
      const entry = createBaseEntry("query:bulk", "query", "mysql2", {
        content: {
          status: "completed",
          duration: 5000,
          metadata: { package: "mysql2", method: "query" },
          data: {
            sql: "SELECT * FROM huge_table",
            rows_affected: 0,
            rows_returned: 10000000, // 10 million rows
          },
        },
      });

      await database.insert([entry]);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results[0].content.data.rows_returned).toBe(10000000);
    });
  });

  // ========== ERROR HANDLING ==========

  describe("Query Error Scenarios", () => {
    it("should track syntax errors", async () => {
      const entry = createBaseEntry("query:syntax-error", "query", "mysql2", {
        content: {
          status: "failed",
          duration: 5,
          metadata: { package: "mysql2", method: "query" },
          data: {
            sql: "SELCT * FROM users", // Typo: SELCT instead of SELECT
            rows_affected: 0,
            rows_returned: 0,
          },
          error: {
            name: "QuerySyntaxError",
            message: "You have an error in your SQL syntax",
          },
        },
      });

      await database.insert([entry]);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results[0].content.error).toBeDefined();
    });

    it("should track database connection errors", async () => {
      const entry = createBaseEntry(
        "query:connection-error",
        "query",
        "mysql2",
        {
          content: {
            status: "failed",
            duration: 30000,
            metadata: { package: "mysql2", method: "query" },
            data: {
              sql: "SELECT 1",
              rows_affected: 0,
              rows_returned: 0,
            },
            error: {
              name: "ConnectionError",
              message: "Connection lost: The server closed the connection.",
              stack: "Error: Connection lost...",
            },
          },
        },
      );

      await database.insert([entry]);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
    });

    it("should track deadlock scenarios", async () => {
      const entry = createBaseEntry("query:deadlock", "query", "mysql2", {
        content: {
          status: "failed",
          duration: 50000,
          metadata: { package: "mysql2", method: "query" },
          data: {
            sql: "UPDATE users SET status = ? WHERE id = ?",
            rows_affected: 0,
            rows_returned: 0,
          },
          error: {
            name: "DeadlockError",
            message:
              "Deadlock found when trying to get lock; try restarting transaction",
          },
        },
      });

      await database.insert([entry]);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
    });
  });

  // ========== CONCURRENT OPERATIONS ==========

  describe("Concurrent Query Operations", () => {
    it("should handle concurrent query insertions without data loss", async () => {
      const baseEntry = createBaseEntry("query:concurrent", "query", "mysql2", {
        content: {
          status: "completed",
          duration: 50,
          metadata: { package: "mysql2", method: "query" },
          data: {
            sql: "SELECT * FROM users",
            rows_returned: 10,
          },
        },
      });

      const { inserted, errors } = await testConcurrentInsertions(
        database,
        baseEntry,
        20,
        0,
      );

      expect(inserted).toBe(20);
      expect(errors).toHaveLength(0);

      // Verify all insertions are retrievable
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        limit: "100",
      });

      const result = await watcher.index(req);
      expect(result.body.results.length).toBeGreaterThanOrEqual(20);
    });
  });

  // ========== EMPTY AND NULL HANDLING ==========

  describe("Empty and Null Field Handling", () => {
    it("should handle missing optional query fields", async () => {
      const entry = createBaseEntry("query:minimal", "query", "mysql2", {
        content: {
          status: "completed",
          duration: 50,
          metadata: { package: "mysql2", method: "query" },
          data: {
            sql: "SELECT 1", // Only required field
          },
        },
      });

      await database.insert([entry]);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      assertEntryStructure(result.body.results[0], "query");
    });

    it("should handle empty SQL string", async () => {
      const entry = createBaseEntry("query:empty-sql", "query", "mysql2", {
        content: {
          status: "completed",
          duration: 0,
          metadata: { package: "mysql2", method: "query" },
          data: {
            sql: "",
            rows_returned: 0,
          },
        },
      });

      await database.insert([entry]);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });

      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
    });
  });
});
