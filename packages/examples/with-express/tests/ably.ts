/** @format
 * Test: ably patcher
 * Run: node -r ts-node/register tests/ably.ts
 * Hit: GET http://localhost:3001/test
 *
 * Requires ABLY_API_KEY env var.
 */
import { createTestApp } from "./bootstrap";
import Ably from "ably";

async function main() {
  const { app, start } = await createTestApp();

  if (!process.env.ABLY_API_KEY) {
    console.warn(
      "ABLY_API_KEY is not set — the /test route will return an error.",
    );
  }

  const ably = new Ably.Rest({
    key: process.env.ABLY_API_KEY || "missing:key",
  });

  /**
   * GET /test
   * Exercises: channel.publish (single + multiple messages)
   */
  app.get("/test", async (_req, res) => {
    if (!process.env.ABLY_API_KEY) {
      return res
        .status(500)
        .json({ ok: false, error: "ABLY_API_KEY env var not set" });
    }

    const channel = ably.channels.get("observatory-test");

    // Single publish
    await channel.publish("single-event", {
      message: "hello from observatory test",
      timestamp: new Date().toISOString(),
    });

    // Multiple messages in one call
    await channel.publish([
      { name: "batch-event-1", data: { seq: 1 } },
      { name: "batch-event-2", data: { seq: 2 } },
    ]);

    res.json({
      ok: true,
      message: "Ably events sent — check Observatory → Notifications",
    });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
