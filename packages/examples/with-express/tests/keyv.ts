/** @format
 * Test: keyv patcher
 * Run: node -r ts-node/register tests/keyv.ts
 * Hit: GET http://localhost:3001/test
 *
 * Uses the default in-memory adapter — no external service required.
 */
import { createTestApp } from "./bootstrap";
import Keyv from "keyv";

async function main() {
  const { app, start } = await createTestApp();

  // In-memory store (no external deps needed)
  const keyv = new Keyv();

  /**
   * GET /test
   * Exercises: set (write), get (hit), get (miss), delete
   */
  app.get("/test", async (_req, res) => {
    // write
    await keyv.set("kv:key1", { data: "hello" });
    await keyv.set("kv:key2", 42, 10_000);  // ttl = 10 s

    // hit
    const hit1 = await keyv.get("kv:key1");
    const hit2 = await keyv.get("kv:key2");

    // miss
    const miss = await keyv.get("kv:missing-key");

    // delete
    await keyv.delete("kv:key1");
    await keyv.delete("kv:key2");

    res.json({ ok: true, hit1, hit2, miss });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
