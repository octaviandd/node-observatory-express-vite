/**
 * Smoke test: HTTP client patchers
 *
 * Exercises whichever HTTP client package is installed (axios, undici,
 * superagent) and verifies an observatory entry reaches the Redis stream.
 *
 * @format
 */

import { createClient } from "redis";

const OBSERVATORY_REDIS = process.env.OBSERVATORY_REDIS_URL ?? "redis://redis-test:6379";
const PACKAGE = process.env.MATRIX_PACKAGE ?? "axios";
const STREAM_KEY = "observatory:stream:http";

// We use a simple echo target; httpbin.org or a local server
const TARGET_URL = process.env.HTTP_TARGET ?? "https://httpbin.org/get";

async function main() {
  const observatoryRedis = createClient({ url: OBSERVATORY_REDIS });
  await observatoryRedis.connect();

  try {
    await observatoryRedis.del(STREAM_KEY);
  } catch {}

  console.log(`[smoke-http] Testing package: ${PACKAGE}`);

  switch (PACKAGE) {
    case "axios": {
      const axios = (await import("axios")).default;
      const res = await axios.get(TARGET_URL);
      console.log(`[smoke-http] axios GET ${TARGET_URL} => ${res.status}`);
      break;
    }
    case "undici": {
      const { request } = await import("undici");
      const res = await request(TARGET_URL);
      console.log(`[smoke-http] undici GET ${TARGET_URL} => ${res.statusCode}`);
      // Drain body
      for await (const _chunk of res.body) { /* drain */ }
      break;
    }
    case "superagent": {
      const superagent = (await import("superagent")).default;
      const res = await superagent.get(TARGET_URL);
      console.log(`[smoke-http] superagent GET ${TARGET_URL} => ${res.status}`);
      break;
    }
    default:
      throw new Error(`Unknown HTTP package: ${PACKAGE}`);
  }

  await new Promise((r) => setTimeout(r, 2000));

  const streamLen = await observatoryRedis.xLen(STREAM_KEY);
  console.log(`[smoke-http] Stream entries after test: ${streamLen}`);

  await observatoryRedis.quit();

  if (streamLen === 0) {
    console.error("[smoke-http] FAIL — no entries in observatory stream");
    process.exit(1);
  }

  console.log("[smoke-http] PASS");
}

main().catch((err) => {
  console.error("[smoke-http] FAIL:", err);
  process.exit(1);
});
