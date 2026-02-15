/**
 * Smoke test: Logger patchers
 *
 * Exercises whichever logging package is installed (winston, pino, bunyan,
 * log4js, loglevel, signale) and verifies an observatory entry reaches
 * the Redis stream.
 *
 * @format
 */

import { createClient } from "redis";

const OBSERVATORY_REDIS = process.env.OBSERVATORY_REDIS_URL ?? "redis://redis-test:6379";
const PACKAGE = process.env.MATRIX_PACKAGE ?? "winston";
const STREAM_KEY = "observatory:stream:log";

async function main() {
  const observatoryRedis = createClient({ url: OBSERVATORY_REDIS });
  await observatoryRedis.connect();

  try {
    await observatoryRedis.del(STREAM_KEY);
  } catch {}

  console.log(`[smoke-logger] Testing package: ${PACKAGE}`);

  switch (PACKAGE) {
    case "winston": {
      const winston = await import("winston");
      const logger = winston.createLogger({
        level: "debug",
        transports: [new winston.transports.Console()],
      });
      logger.info("Smoke test info");
      logger.warn("Smoke test warn");
      logger.error("Smoke test error");
      break;
    }
    case "pino": {
      const pino = (await import("pino")).default;
      const logger = pino({ level: "debug" });
      logger.info("Smoke test info");
      logger.warn("Smoke test warn");
      logger.error("Smoke test error");
      break;
    }
    case "bunyan": {
      const bunyan = await import("bunyan");
      const logger = bunyan.createLogger({ name: "smoke-test" });
      logger.info("Smoke test info");
      logger.warn("Smoke test warn");
      logger.error("Smoke test error");
      break;
    }
    case "log4js": {
      const log4js = await import("log4js");
      log4js.configure({ appenders: { out: { type: "stdout" } }, categories: { default: { appenders: ["out"], level: "debug" } } });
      const logger = log4js.getLogger();
      logger.info("Smoke test info");
      logger.warn("Smoke test warn");
      logger.error("Smoke test error");
      break;
    }
    case "loglevel": {
      const loglevel = await import("loglevel");
      loglevel.setLevel("debug");
      loglevel.info("Smoke test info");
      loglevel.warn("Smoke test warn");
      loglevel.error("Smoke test error");
      break;
    }
    case "signale": {
      const { Signale } = await import("signale");
      const logger = new Signale();
      logger.info("Smoke test info");
      logger.warn("Smoke test warn");
      logger.error("Smoke test error");
      break;
    }
    default:
      throw new Error(`Unknown logger package: ${PACKAGE}`);
  }

  await new Promise((r) => setTimeout(r, 2000));

  const streamLen = await observatoryRedis.xLen(STREAM_KEY);
  console.log(`[smoke-logger] Stream entries after test: ${streamLen}`);

  await observatoryRedis.quit();

  if (streamLen === 0) {
    console.error("[smoke-logger] FAIL — no entries in observatory stream");
    process.exit(1);
  }

  console.log("[smoke-logger] PASS");
}

main().catch((err) => {
  console.error("[smoke-logger] FAIL:", err);
  process.exit(1);
});
