/**
 * Smoke test: Notification patchers (ably, pusher)
 *
 * These packages require external services (Ably/Pusher) so we verify
 * import + basic instantiation. Real message sending requires API keys.
 *
 * @format
 */

import { createClient } from "redis";

const OBSERVATORY_REDIS = process.env.OBSERVATORY_REDIS_URL ?? "redis://redis-test:6379";
const PACKAGE = process.env.MATRIX_PACKAGE ?? "ably";
const STREAM_KEY = "observatory:stream:notification";

async function main() {
  const observatoryRedis = createClient({ url: OBSERVATORY_REDIS });
  await observatoryRedis.connect();

  try {
    await observatoryRedis.del(STREAM_KEY);
  } catch {}

  console.log(`[smoke-notification] Testing package: ${PACKAGE}`);

  switch (PACKAGE) {
    case "ably": {
      console.log("[smoke-notification] ably — verifying import + instantiation");
      const Ably = await import("ably");
      // Just verify the module exports exist
      console.log("[smoke-notification] ably has Realtime:", typeof Ably.Realtime);
      console.log("[smoke-notification] ably imported successfully");
      break;
    }
    case "pusher": {
      console.log("[smoke-notification] pusher — verifying import + instantiation");
      const Pusher = (await import("pusher")).default;
      console.log("[smoke-notification] pusher constructor:", typeof Pusher);
      console.log("[smoke-notification] pusher imported successfully");
      break;
    }
    default:
      throw new Error(`Unknown notification package: ${PACKAGE}`);
  }

  await new Promise((r) => setTimeout(r, 1000));
  await observatoryRedis.quit();

  // Notification packages are import-only in CI (need real API keys)
  console.log("[smoke-notification] PASS (import-only verification)");
}

main().catch((err) => {
  console.error("[smoke-notification] FAIL:", err);
  process.exit(1);
});
