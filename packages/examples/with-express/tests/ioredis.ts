/** @format
 * Test: ioredis patcher
 * Run: node -r ts-node/register tests/ioredis.ts
 * Hit: GET http://localhost:3001/test
 *
 * Requires Redis running on localhost:6379 (or REDIS_HOST / REDIS_PORT env vars).
 */
import { createTestApp } from "./bootstrap";
import IORedis from "ioredis";

async function main() {
  const { app, start } = await createTestApp();

  const io = new IORedis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  });

  /**
   * GET /test
   * Exercises: set (write), get (hit), get (miss), del, expire
   */
  app.get("/test", async (_req, res) => {
    // write
    await io.set("io:key1", "hello");
    await io.set("io:key2", "world", "EX", 30);

    // hit
    const hit1 = await io.get("io:key1");
    const hit2 = await io.get("io:key2");

    // miss
    const miss = await io.get("io:missing-key");

    // hash operations
    await io.hset("io:hash", "field1", "val1", "field2", "val2");
    const hashField = await io.hget("io:hash", "field1");
    const hashAll = await io.hgetall("io:hash");

    // list operations
    await io.rpush("io:list", "a", "b", "c");
    const listItem = await io.lrange("io:list", 0, -1);

    // cleanup
    await io.del("io:key1", "io:key2", "io:hash", "io:list");

    res.json({ ok: true, hit1, hit2, miss, hashField, hashAll, listItem });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
