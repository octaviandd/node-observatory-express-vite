/**
 * Smoke test: Database / ORM patchers
 *
 * Exercises whichever database package is installed (mysql2, pg, knex,
 * mongoose, sequelize, typeorm, sqlite3) and verifies an observatory
 * entry reaches the Redis stream.
 *
 * @format
 */

import { createClient } from "redis";

const OBSERVATORY_REDIS = process.env.OBSERVATORY_REDIS_URL ?? "redis://redis-test:6379";
const PACKAGE = process.env.MATRIX_PACKAGE ?? "mysql2";
const STREAM_KEY = "observatory:stream:query";

// DB connection details from the matrix docker-compose
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST ?? "mysql-test",
  port: parseInt(process.env.MYSQL_PORT ?? "3306", 10),
  user: process.env.MYSQL_USER ?? "test_user",
  password: process.env.MYSQL_PASSWORD ?? "test_password",
  database: process.env.MYSQL_DATABASE ?? "observatory_test",
};

async function main() {
  const observatoryRedis = createClient({ url: OBSERVATORY_REDIS });
  await observatoryRedis.connect();

  try {
    await observatoryRedis.del(STREAM_KEY);
  } catch {}

  console.log(`[smoke-query] Testing package: ${PACKAGE}`);

  switch (PACKAGE) {
    case "mysql2": {
      const mysql2 = await import("mysql2/promise");
      const conn = await mysql2.createConnection(MYSQL_CONFIG);
      await conn.query("SELECT 1 + 1 AS result");
      await conn.end();
      break;
    }
    case "pg": {
      const { Client } = await import("pg");
      const client = new Client({
        host: process.env.PG_HOST ?? "postgres-test",
        port: parseInt(process.env.PG_PORT ?? "5432", 10),
        user: process.env.PG_USER ?? "test_user",
        password: process.env.PG_PASSWORD ?? "test_password",
        database: process.env.PG_DATABASE ?? "observatory_test",
      });
      await client.connect();
      await client.query("SELECT 1 + 1 AS result");
      await client.end();
      break;
    }
    case "knex": {
      const knex = (await import("knex")).default;
      const db = knex({
        client: "mysql2",
        connection: MYSQL_CONFIG,
      });
      await db.raw("SELECT 1 + 1 AS result");
      await db.destroy();
      break;
    }
    case "mongoose": {
      console.log("[smoke-query] mongoose requires MongoDB — verifying import only");
      await import("mongoose");
      console.log("[smoke-query] mongoose imported successfully");
      break;
    }
    case "sequelize": {
      const { Sequelize } = await import("sequelize");
      const sequelize = new Sequelize(
        MYSQL_CONFIG.database,
        MYSQL_CONFIG.user,
        MYSQL_CONFIG.password,
        { host: MYSQL_CONFIG.host, port: MYSQL_CONFIG.port, dialect: "mysql", logging: false },
      );
      await sequelize.query("SELECT 1 + 1 AS result");
      await sequelize.close();
      break;
    }
    case "typeorm": {
      console.log("[smoke-query] typeorm — verifying import only (requires decorators + entities)");
      await import("typeorm");
      console.log("[smoke-query] typeorm imported successfully");
      break;
    }
    case "sqlite3": {
      const sqlite3 = await import("sqlite3");
      const db = new sqlite3.default.Database(":memory:");
      await new Promise<void>((resolve, reject) => {
        db.run("SELECT 1 + 1 AS result", (err: any) => (err ? reject(err) : resolve()));
      });
      await new Promise<void>((resolve) => db.close(() => resolve()));
      break;
    }
    default:
      throw new Error(`Unknown query package: ${PACKAGE}`);
  }

  await new Promise((r) => setTimeout(r, 2000));

  const streamLen = await observatoryRedis.xLen(STREAM_KEY);
  console.log(`[smoke-query] Stream entries after test: ${streamLen}`);

  await observatoryRedis.quit();

  // Packages that require external services not in our matrix get import-only checks
  const importOnly = ["mongoose", "typeorm"];
  if (!importOnly.includes(PACKAGE) && streamLen === 0) {
    console.error("[smoke-query] FAIL — no entries in observatory stream");
    process.exit(1);
  }

  console.log("[smoke-query] PASS");
}

main().catch((err) => {
  console.error("[smoke-query] FAIL:", err);
  process.exit(1);
});
