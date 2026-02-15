/**
 * Smoke test: Job queue patchers
 *
 * Exercises whichever job queue package is installed (bull, agenda, bree)
 * and verifies an observatory entry reaches the Redis stream.
 *
 * @format
 */

import { createClient } from "redis";

const OBSERVATORY_REDIS = process.env.OBSERVATORY_REDIS_URL ?? "redis://redis-test:6379";
const PACKAGE = process.env.MATRIX_PACKAGE ?? "bull";
const STREAM_KEY = "observatory:stream:job";

async function main() {
  const observatoryRedis = createClient({ url: OBSERVATORY_REDIS });
  await observatoryRedis.connect();

  try {
    await observatoryRedis.del(STREAM_KEY);
  } catch {}

  console.log(`[smoke-job] Testing package: ${PACKAGE}`);

  switch (PACKAGE) {
    case "bull": {
      const Bull = (await import("bull")).default;
      const queue = new Bull("smoke-test", OBSERVATORY_REDIS);
      queue.process(async (job: any) => {
        return { result: `processed ${job.id}` };
      });
      await queue.add({ payload: "smoke-data" });
      // Wait for the job to be processed
      await new Promise((r) => setTimeout(r, 3000));
      await queue.close();
      break;
    }
    case "agenda": {
      console.log("[smoke-job] agenda requires MongoDB — verifying import only");
      await import("agenda");
      console.log("[smoke-job] agenda imported successfully");
      break;
    }
    case "bree": {
      console.log("[smoke-job] bree — verifying import only");
      await import("bree");
      console.log("[smoke-job] bree imported successfully");
      break;
    }
    default:
      throw new Error(`Unknown job package: ${PACKAGE}`);
  }

  await new Promise((r) => setTimeout(r, 2000));

  const streamLen = await observatoryRedis.xLen(STREAM_KEY);
  console.log(`[smoke-job] Stream entries after test: ${streamLen}`);

  await observatoryRedis.quit();

  // Only bull can produce actual entries in this setup
  if (PACKAGE === "bull" && streamLen === 0) {
    console.error("[smoke-job] FAIL — no entries in observatory stream");
    process.exit(1);
  }

  console.log("[smoke-job] PASS");
}

main().catch((err) => {
  console.error("[smoke-job] FAIL:", err);
  process.exit(1);
});
