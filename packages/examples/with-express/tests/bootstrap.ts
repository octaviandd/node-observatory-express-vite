/** @format */
import "dotenv/config";
// Importing the api package activates all patchers regardless of whether
// createObserver succeeds — data recording requires MySQL + Redis, but
// patcher interception works either way.
import { createObserver } from "@node-observatory/api";
import { ExpressAdapter } from "@node-observatory/express";
import express, { Express } from "express";
import mysql2 from "mysql2/promise";
import { createClient, RedisClientType } from "redis";

export interface TestApp {
  app: Express;
  adapter: ExpressAdapter | null;
  connection: mysql2.Connection | null;
  redis: RedisClientType | null;
  /** Observatory UI is available only when MySQL + Redis connected successfully. */
  observatoryReady: boolean;
  /** Call after adding your routes to start listening. */
  start: (port?: number) => void;
}

export async function createTestApp(): Promise<TestApp> {
  const app = express();
  app.use(express.json());

  let connection: mysql2.Connection | null = null;
  let redis: RedisClientType | null = null;
  let adapter: ExpressAdapter | null = null;
  let observatoryReady = false;

  try {
    connection = await mysql2.createConnection({
      host: process.env.MYSQL_HOST || "localhost",
      port: parseInt(process.env.MYSQL_PORT || "3306", 10),
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "observatory",
    });

    const redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });
    await redisClient.connect();
    redis = redisClient as RedisClientType;

    adapter = new ExpressAdapter();
    adapter.setBasePath("/ui");
    app.use("/ui", adapter.getRouter());

    await createObserver(
      adapter,
      { devMode: true },
      "mysql2",
      connection,
      redis,
    );
    observatoryReady = true;
  } catch (err: any) {
    console.warn(
      `\n[bootstrap] Observatory setup skipped: ${err.message}` +
        `\n  → Patchers are still active; start MySQL + Redis to record data in the UI.\n`,
    );
  }

  const start = (port = parseInt(process.env.PORT || "3001", 10)) => {
    app.listen(port, () => {
      console.log(`\nTest server running on http://localhost:${port}`);
      if (observatoryReady) {
        console.log(`  Observatory UI  → http://localhost:${port}/ui`);
      } else {
        console.log(
          `  Observatory UI  → not available (MySQL/Redis not connected)`,
        );
      }
      console.log(`  Test route      → http://localhost:${port}/test\n`);
    });
  };

  return { app, adapter, connection, redis, observatoryReady, start };
}
