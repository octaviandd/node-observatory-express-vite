/**
 * Smoke test: Cache patchers
 *
 * Exercises whichever cache package is installed (redis, ioredis, node-cache,
 * lru-cache, keyv, memjs, level) and verifies an observatory entry reaches
 * the Redis stream.
 *
 * Run inside the Docker matrix container.
 *
 * @format
 */

import { createClient, RedisClientType } from "redis";

const OBSERVATORY_REDIS = process.env.OBSERVATORY_REDIS_URL ?? "redis://redis-test:6379";
const PACKAGE = process.env.MATRIX_PACKAGE ?? "redis";
const STREAM_KEY = "observatory:stream:cache";

async function main() {
  const observatoryRedis = createClient({ url: OBSERVATORY_REDIS });
  await observatoryRedis.connect();

  // Flush the stream so we can measure from zero
  try {
    await observatoryRedis.del(STREAM_KEY);
  } catch {}

  console.log(`[smoke-cache] Testing package: ${PACKAGE}`);

  switch (PACKAGE) {
    case "redis": {
      const redis = await import("redis");
      const client = redis.createClient({ url: OBSERVATORY_REDIS });
      await client.connect();
      await client.set("smoke-key", "smoke-value");
      await client.get("smoke-key");
      await client.del("smoke-key");
      await client.quit();
      break;
    }
    case "ioredis": {
      const IORedis = (await import("ioredis")).default;
      const client = new IORedis(OBSERVATORY_REDIS);
      await client.set("smoke-key", "smoke-value");
      await client.get("smoke-key");
      await client.del("smoke-key");
      client.disconnect();
      break;
    }
    case "node-cache": {
      const NodeCache = (await import("node-cache")).default;
      const cache = new NodeCache();
      cache.set("smoke-key", "smoke-value");
      cache.get("smoke-key");
      cache.del("smoke-key");
      break;
    }
    case "lru-cache": {
      const { LRUCache } = await import("lru-cache");
      const cache = new LRUCache({ max: 100 });
      cache.set("smoke-key", "smoke-value");
      cache.get("smoke-key");
      cache.delete("smoke-key");
      break;
    }
    case "keyv": {
      const Keyv = (await import("keyv")).default;
      const keyv = new Keyv();
      await keyv.set("smoke-key", "smoke-value");
      await keyv.get("smoke-key");
      await keyv.delete("smoke-key");
      break;
    }
    case "memjs": {
      const memjs = await import("memjs");
      console.log("[smoke-cache] memjs imported successfully — skipping live ops (no memcached in matrix)");
      break;
    }
    case "level": {
      const { Level } = await import("level");
      const db = new Level("/tmp/smoke-level-test");
      await db.put("smoke-key", "smoke-value");
      await db.get("smoke-key");
      await db.del("smoke-key");
      await db.close();
      break;
    }
    default:
      throw new Error(`Unknown cache package: ${PACKAGE}`);
  }

  // Give observatory time to flush to stream
  await new Promise((r) => setTimeout(r, 2000));

  const streamLen = await observatoryRedis.xLen(STREAM_KEY);
  console.log(`[smoke-cache] Stream entries after test: ${streamLen}`);

  await observatoryRedis.quit();

  if (streamLen === 0 && PACKAGE !== "memjs") {
    console.error("[smoke-cache] FAIL — no entries in observatory stream");
    process.exit(1);
  }

  console.log("[smoke-cache] PASS");
}

main().catch((err) => {
  console.error("[smoke-cache] FAIL:", err);
  process.exit(1);
});
