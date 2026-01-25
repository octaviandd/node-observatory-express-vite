/**
 * Integration Test Utilities
 *
 * Provides real Redis and MySQL connections for integration tests,
 * along with utility functions to reset data between tests.
 *
 * @format
 */

import { createClient, RedisClientType } from "redis";
import mysql, { Connection } from "mysql2/promise";

// Test container configuration
export const TEST_CONFIG = {
  redis: {
    url: "redis://localhost:6380",
  },
  mysql: {
    host: "localhost",
    port: 3307,
    user: "test_user",
    password: "test_password",
    database: "observatory_test",
  },
};

let redisClient: RedisClientType | null = null;
let mysqlConnection: Connection | null = null;
// Track watchers for cleanup
const activeWatchers: any[] = [];

/**
 * Creates and returns a Redis client connected to the test container.
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  redisClient = createClient({ url: TEST_CONFIG.redis.url });

  redisClient.on("error", (err) => {
    console.error("Redis Test Client Error:", err);
  });

  await redisClient.connect();
  return redisClient;
}

/**
 * Creates and returns a MySQL connection to the test container.
 */
export async function getMySQLConnection(): Promise<Connection> {
  if (mysqlConnection) {
    try {
      await mysqlConnection.ping();
      return mysqlConnection;
    } catch {
      // Connection lost, reconnect
      mysqlConnection = null;
    }
  }

  mysqlConnection = await mysql.createConnection(TEST_CONFIG.mysql);
  return mysqlConnection;
}

/**
 * Resets the Redis database by flushing all keys.
 */
export async function resetRedis(): Promise<void> {
  const client = await getRedisClient();
  await client.flushDb();
}

/**
 * Resets the MySQL database by truncating the observatory_entries table.
 */
export async function resetDatabase(): Promise<void> {
  const connection = await getMySQLConnection();

  // Disable foreign key checks for truncate
  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  await connection.query("TRUNCATE TABLE observatory_entries");
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");
}

/**
 * Ensures the observatory_entries table exists in the test database.
 */
export async function ensureTestSchema(): Promise<void> {
  const connection = await getMySQLConnection();

  const [rows]: any = await connection.query(`
    SELECT COUNT(*) as count 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE()
    AND table_name = 'observatory_entries'
  `);

  if (rows[0].count === 0) {
    await connection.query(`
      CREATE TABLE observatory_entries (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        request_id CHAR(36) NULL,
        job_id CHAR(36) NULL,
        schedule_id CHAR(36) NULL,
        type VARCHAR(20) NOT NULL,
        content JSON NOT NULL,
        created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),

        INDEX idx_uuid (uuid),
        INDEX idx_request_id (request_id),
        INDEX idx_job_id (job_id),
        INDEX idx_schedule_id (schedule_id),
        INDEX idx_type (type),
        INDEX idx_created_at (created_at)
      );
    `);
    console.log("Test schema created: observatory_entries table");
  }
}

/**
 * Verifies that both Redis and MySQL test containers are accessible.
 * Throws an error if containers are not running.
 */
export async function verifyContainers(): Promise<void> {
  const errors: string[] = [];

  // Check Redis
  try {
    const redis = await getRedisClient();
    await redis.ping();
  } catch (error) {
    errors.push(
      `Redis container not accessible at ${TEST_CONFIG.redis.url}: ${(error as Error).message}`,
    );
  }

  // Check MySQL
  try {
    const mysql = await getMySQLConnection();
    await mysql.ping();
  } catch (error) {
    errors.push(
      `MySQL container not accessible at ${TEST_CONFIG.mysql.host}:${TEST_CONFIG.mysql.port}: ${(error as Error).message}`,
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Test containers are not accessible.\n` +
        `If running 'npm run test:integration:only', start containers first with 'npm run test:docker:up'\n` +
        `Otherwise use 'npm run test:integration' to auto-start containers.\n\n` +
        errors.join("\n"),
    );
  }
}

/**
 * Register a watcher for cleanup
 */
export function registerWatcher(watcher: any): void {
  if (watcher && !activeWatchers.includes(watcher)) {
    activeWatchers.push(watcher);
  }
}

/**
 * Stop all registered watchers
 */
export async function stopAllWatchers(): Promise<void> {
  const stopPromises = activeWatchers
    .filter((w) => w && typeof w.stop === "function")
    .map((w) => {
      try {
        return Promise.resolve(w.stop());
      } catch (error) {
        console.error("Error stopping watcher:", error);
        return Promise.resolve();
      }
    });

  await Promise.all(stopPromises);
  activeWatchers.length = 0;
}

/**
 * Closes all test connections. Call this in afterAll.
 */
export async function closeConnections(): Promise<void> {
  // Stop all watchers first
  await stopAllWatchers();

  // Give a moment for background tasks to finish
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }

  if (mysqlConnection) {
    await mysqlConnection.end();
    mysqlConnection = null;
  }
}

/**
 * Full reset of test environment - clears both Redis and MySQL.
 */
export async function resetAll(): Promise<void> {
  await Promise.all([resetRedis(), resetDatabase()]);
}
