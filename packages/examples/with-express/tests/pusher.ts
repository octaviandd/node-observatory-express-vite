/** @format
 * Test: pusher patcher
 * Run: node -r ts-node/register tests/pusher.ts
 * Hit: GET http://localhost:3001/test
 *
 * Uses PUSHER_* env vars from .env (app ID 1900516, cluster eu).
 */
import { createTestApp } from "./bootstrap";
import Pusher from "pusher";

async function main() {
  const { app, start } = await createTestApp();

  const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID || "test-app-id",
    key: process.env.PUSHER_KEY || "test-key",
    secret: process.env.PUSHER_SECRET || "test-secret",
    cluster: process.env.PUSHER_CLUSTER || "mt1",
    useTLS: true,
  });

  /**
   * GET /test
   * Exercises: trigger (single channel), triggerBatch (multiple events)
   */
  app.get("/test", async (_req, res) => {
    // Single trigger
    await pusher.trigger("observatory-test", "single-event", {
      message: "hello from observatory test",
      timestamp: new Date().toISOString(),
    });

    // Batch trigger
    await pusher.triggerBatch([
      {
        channel: "observatory-test",
        name: "batch-event-1",
        data: { seq: 1 },
      },
      {
        channel: "observatory-test",
        name: "batch-event-2",
        data: { seq: 2 },
      },
    ]);

    res.json({ ok: true, message: "Pusher events sent — check Observatory → Notifications" });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
