/** @format
 * Test: node-cache patcher
 * Run: node -r ts-node/register tests/node-cache.ts
 * Hit: GET http://localhost:3001/test
 */
import { createTestApp } from "./bootstrap";
import NodeCache from "node-cache";

async function main() {
  const { app, start } = await createTestApp();

  const cache = new NodeCache({ stdTTL: 60 });

  /**
   * GET /test
   * Exercises: set (write), get (hit), get (miss), del
   */
  app.get("/test", (_req, res) => {
    // write
    cache.set("nc:key1", { value: "hello" });
    cache.set("nc:key2", 42, 10);

    // hit
    const hit1 = cache.get("nc:key1");
    const hit2 = cache.get("nc:key2");

    // miss
    const miss = cache.get("nc:missing-key");

    // delete
    cache.del("nc:key2");

    // stats
    const stats = cache.getStats();

    res.json({ ok: true, hit1, hit2, miss, stats });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
