/** @format
 * Test: bull patcher
 * Run: node -r ts-node/register tests/bull.ts
 * Hit: GET http://localhost:3001/test
 *
 * Requires Redis running on localhost:6379 (or REDIS_HOST / REDIS_PORT env vars).
 */
import { createTestApp } from "./bootstrap";
import Bull from "bull";

async function main() {
  const { app, start } = await createTestApp();

  const queue = new Bull("observatory-test-queue", {
    redis: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
    },
  });

  // Process jobs as they arrive
  queue.process("simple", async (job) => {
    return { processed: true, data: job.data };
  });

  queue.process("delayed", async (job) => {
    return { processed: true, delayed: true, data: job.data };
  });

  queue.process("failing", async (_job) => {
    throw new Error("Intentional job failure");
  });

  queue.on("completed", (job, result) => {
    console.log(`Job ${job.id} (${job.name}) completed:`, result);
  });

  queue.on("failed", (job, err) => {
    console.log(`Job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  /**
   * GET /test
   * Exercises: add (simple), add (delayed), add (repeating), add (failing)
   */
  app.get("/test", async (_req, res) => {
    // Immediate job
    const j1 = await queue.add("simple", { payload: "immediate" });

    // Delayed job (5 s)
    const j2 = await queue.add(
      "delayed",
      { payload: "delayed" },
      { delay: 5_000 },
    );

    // Job with retries
    const j3 = await queue.add(
      "failing",
      { payload: "will-fail" },
      { attempts: 3, backoff: { type: "exponential", delay: 500 } },
    );

    res.json({
      ok: true,
      jobs: [
        { id: j1.id, name: j1.name, status: "queued" },
        { id: j2.id, name: j2.name, status: "delayed 5s" },
        { id: j3.id, name: j3.name, status: "will-fail (3 attempts)" },
      ],
      message: "Jobs enqueued — check Observatory → Jobs",
    });
  });

  /**
   * GET /test/counts — show queue state counts
   */
  app.get("/test/counts", async (_req, res) => {
    const counts = await queue.getJobCounts();
    res.json({ ok: true, counts });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
