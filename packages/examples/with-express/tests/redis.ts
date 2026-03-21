/** @format
 * Test: redis patcher
 * Run: node -r ts-node/register tests/redis.ts
 * Hit: GET http://localhost:3001/test
 *
 * Requires Redis running on localhost:6379 (or REDIS_URL env var).
 */
import { createTestApp } from "./bootstrap";
import { createClient } from "redis";

async function main() {
  const { app, start } = await createTestApp();

  // Own client so this test works regardless of bootstrap Observatory state
  const client = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });
  await client.connect();

  /**
   * GET /test
   * Exercises: set (write), get (hit), get (miss), del, incr
   */
  app.get("/test", async (_req, res) => {
    // write
    await client.set("rd:key1", "hello");
    await client.set("rd:key2", JSON.stringify({ nested: true }), { EX: 30 });

    // hit
    const hit1 = await client.get("rd:key1");
    const hit2 = await client.get("rd:key2");

    // miss
    const miss = await client.get("rd:missing-key");

    // incr / decr
    await client.set("rd:counter", "0");
    await client.incr("rd:counter");
    await client.incr("rd:counter");
    const counter = await client.get("rd:counter");

    // delete
    await client.del("rd:key1");
    await client.del("rd:key2");
    await client.del("rd:counter");

    res.json({ ok: true, hit1, hit2, miss, counter });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
