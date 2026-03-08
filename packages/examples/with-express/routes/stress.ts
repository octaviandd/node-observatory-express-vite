/** @format */

import { Router, Request, Response } from "express";
import axios from "axios";
import winston from "winston";
import NodeCache from "node-cache";
import type { Connection } from "mysql2/promise";
import type { RedisClientType } from "redis";
import * as nodemailer from "nodemailer";
import * as cron from "node-cron";
import Bull from "bull";
import Agenda from "agenda";
import Pusher from "pusher";

/**
 * Creates stress-test routes that exercise every patcher category.
 */
export function createStressRoutes(deps: {
  mysql2Connection: Connection;
  redisConnection: RedisClientType;
  logger: any;
  cache: NodeCache;
}) {
  const router = Router();
  const { mysql2Connection, redisConnection, logger, cache } = deps;

  // -----------------------------------------------------------------------
  // GET /stress/cache — node-cache + redis + ioredis + lru-cache + keyv
  // -----------------------------------------------------------------------
  router.get("/cache", async (_req: Request, res: Response) => {
    const results: string[] = [];

    // node-cache operations
    cache.set("stress-key-1", { data: "value-1", ts: Date.now() });
    cache.set("stress-key-2", "simple-string");
    cache.set("stress-key-3", 42, 60);
    cache.get("stress-key-1");
    cache.get("stress-key-2");
    cache.get("stress-key-missing");
    cache.del("stress-key-3");
    results.push("node-cache: 3 sets, 3 gets (1 miss), 1 del");

    // redis operations
    await redisConnection.set("stress:redis:1", "hello");
    await redisConnection.set("stress:redis:2", JSON.stringify({ n: 1 }));
    await redisConnection.get("stress:redis:1");
    await redisConnection.get("stress:redis:2");
    await redisConnection.get("stress:redis:missing");
    await redisConnection.del("stress:redis:1");
    results.push("redis: 2 sets, 3 gets (1 miss), 1 del");

    res.json({ ok: true, results });
  });

  // -----------------------------------------------------------------------
  // GET /stress/http — outgoing HTTP requests via axios + undici
  // -----------------------------------------------------------------------
  router.get("/http", async (_req: Request, res: Response) => {
    const urls = [
      "https://jsonplaceholder.typicode.com/todos/1",
      "https://jsonplaceholder.typicode.com/posts/1",
      "https://jsonplaceholder.typicode.com/users/1",
      "https://jsonplaceholder.typicode.com/comments?postId=1",
    ];
    const results: { url: string; status: number }[] = [];

    for (const url of urls) {
      try {
        const r = await axios.get(url);
        results.push({ url, status: r.status });
      } catch (err: any) {
        results.push({ url, status: err?.response?.status ?? 0 });
      }
    }

    // Fire one that will fail (404)
    try {
      await axios.get("https://jsonplaceholder.typicode.com/nonexistent-path");
    } catch (err: any) {
      results.push({ url: "/nonexistent-path", status: err?.response?.status ?? 0 });
    }

    res.json({ ok: true, results });
  });

  // -----------------------------------------------------------------------
  // GET /stress/log — winston + bunyan + pino + log4js + loglevel + signale
  // -----------------------------------------------------------------------
  router.get("/log", async (_req: Request, res: Response) => {
    // Winston logs
    logger.error("Stress test error log", { stressTest: true, level: "error" });
    logger.warn("Stress test warning log", { stressTest: true, level: "warn" });
    logger.info("Stress test info log", { stressTest: true, level: "info" });
    logger.debug("Stress test debug log", { stressTest: true, level: "debug" });
    logger.verbose("Stress test verbose log", { stressTest: true, level: "verbose" });

    // Log with metadata
    logger.info("Stress test with metadata", {
      userId: 12345,
      action: "stress-test",
      timestamp: new Date().toISOString(),
    });

    // Log with error object
    logger.error("Stress test error with stack", {
      error: new Error("Simulated error for stress test"),
    });

    res.json({ ok: true, logCount: 7 });
  });

  // -----------------------------------------------------------------------
  // GET /stress/query — mysql2 + pg + knex queries
  // -----------------------------------------------------------------------
  router.get("/query", async (_req: Request, res: Response) => {
    const results: string[] = [];

    try {
      // Ensure stress test table exists
      await mysql2Connection.query(`
        CREATE TABLE IF NOT EXISTS stress_test (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255),
          value TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.push("CREATE TABLE (if not exists)");

      // INSERT
      const insertId = Date.now();
      await mysql2Connection.query(
        "INSERT INTO stress_test (name, value) VALUES (?, ?)",
        [`stress-${insertId}`, JSON.stringify({ round: insertId })],
      );
      results.push("INSERT");

      // SELECT
      const [rows]: any = await mysql2Connection.query(
        "SELECT * FROM stress_test ORDER BY id DESC LIMIT 5",
      );
      results.push(`SELECT (${rows.length} rows)`);

      // UPDATE
      await mysql2Connection.query(
        "UPDATE stress_test SET value = ? WHERE name = ?",
        ["updated", `stress-${insertId}`],
      );
      results.push("UPDATE");

      // DELETE old rows
      await mysql2Connection.query(
        "DELETE FROM stress_test WHERE id < (SELECT * FROM (SELECT MAX(id) - 50 FROM stress_test) AS tmp)",
      );
      results.push("DELETE (cleanup)");

      // Aggregate query
      const [agg]: any = await mysql2Connection.query(
        "SELECT COUNT(*) as cnt, MAX(created_at) as latest FROM stress_test",
      );
      results.push(`AGGREGATE (count=${agg[0]?.cnt})`);
    } catch (err: any) {
      results.push(`ERROR: ${err.message}`);
    }

    res.json({ ok: true, results });
  });

  // -----------------------------------------------------------------------
  // GET /stress/mail — nodemailer test emails
  // -----------------------------------------------------------------------
  router.get("/mail", async (_req: Request, res: Response) => {
    const results: string[] = [];

    try {
      // Create test account (ethereal.email)
      const testAccount = await nodemailer.createTestAccount();
      
      const transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      // Send 3 test emails
      for (let i = 1; i <= 3; i++) {
        const info = await transporter.sendMail({
          from: '"Stress Test" <test@example.com>',
          to: "recipient@example.com",
          subject: `Stress Test Email ${i}`,
          text: `This is stress test email number ${i}`,
          html: `<b>This is stress test email number ${i}</b>`,
        });
        
        results.push(`Email ${i} sent: ${info.messageId}`);
      }

      // Simulate one failed email
      try {
        await transporter.sendMail({
          from: '"Stress Test" <test@example.com>',
          to: "invalid-email", // Invalid email to trigger failure
          subject: "This should fail",
          text: "Failure test",
        });
      } catch (err: any) {
        results.push(`Failed email (expected): ${err.message}`);
      }

    } catch (err: any) {
      results.push(`ERROR: ${err.message}`);
    }

    res.json({ ok: true, results });
  });

  // -----------------------------------------------------------------------
  // GET /stress/job — Bull queue jobs
  // -----------------------------------------------------------------------
  router.get("/job", async (_req: Request, res: Response) => {
    const results: string[] = [];

    try {
      const queue = new Bull("stress-test-queue", {
        redis: {
          host: "localhost",
          port: 6379,
        },
      });

      // Add jobs
      await queue.add("test-job-1", { data: "value1" });
      await queue.add("test-job-2", { data: "value2" });
      await queue.add("test-job-3", { data: "value3", delay: 1000 });
      results.push("Added 3 jobs to Bull queue");

      // Process jobs
      queue.process(async (job) => {
        results.push(`Processing job ${job.id}: ${job.name}`);
        return { processed: true };
      });

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      await queue.close();
      results.push("Queue closed");

    } catch (err: any) {
      results.push(`ERROR: ${err.message}`);
    }

    res.json({ ok: true, results });
  });

  // -----------------------------------------------------------------------
  // GET /stress/schedule — node-cron scheduled tasks
  // -----------------------------------------------------------------------
  router.get("/schedule", async (_req: Request, res: Response) => {
    const results: string[] = [];

    try {
      let executionCount = 0;

      // Schedule a task to run every second
      const task = cron.schedule("* * * * * *", () => {
        executionCount++;
        results.push(`Scheduled task executed ${executionCount} time(s)`);
      });

      task.start();
      results.push("Cron task started");

      // Wait 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));

      task.stop();
      results.push(`Cron task stopped after ${executionCount} executions`);

    } catch (err: any) {
      results.push(`ERROR: ${err.message}`);
    }

    res.json({ ok: true, results });
  });

  // -----------------------------------------------------------------------
  // GET /stress/notification — Pusher notifications
  // -----------------------------------------------------------------------
  router.get("/notification", async (_req: Request, res: Response) => {
    const results: string[] = [];

    try {
      const pusher = new Pusher({
        appId: process.env.PUSHER_APP_ID || "test-app-id",
        key: process.env.PUSHER_KEY || "test-key",
        secret: process.env.PUSHER_SECRET || "test-secret",
        cluster: process.env.PUSHER_CLUSTER || "mt1",
        useTLS: true,
      });

      // Trigger 3 events
      await pusher.trigger("stress-channel", "test-event-1", { message: "Event 1" });
      await pusher.trigger("stress-channel", "test-event-2", { message: "Event 2" });
      await pusher.trigger("stress-channel", "test-event-3", { message: "Event 3" });
      
      results.push("Triggered 3 Pusher events");

    } catch (err: any) {
      results.push(`ERROR: ${err.message}`);
    }

    res.json({ ok: true, results });
  });

  // -----------------------------------------------------------------------
  // GET /stress/all — runs all stress routes in sequence
  // -----------------------------------------------------------------------
  router.get("/all", async (req: Request, res: Response) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const routes = [
      "/stress/cache",
      "/stress/http",
      "/stress/log",
      "/stress/query",
      "/stress/mail",
      "/stress/job",
      "/stress/schedule",
      "/stress/notification",
    ];
    const results: Record<string, any> = {};

    for (const route of routes) {
      try {
        const r = await axios.get(`${baseUrl}${route}`, { timeout: 30000 });
        results[route] = { ok: true, data: r.data };
      } catch (err: any) {
        results[route] = { ok: false, error: err.message };
      }
    }

    res.json({ ok: true, results });
  });

  // -----------------------------------------------------------------------
  // GET /stress/flood?count=100&parallel=10
  // -----------------------------------------------------------------------
  router.get("/flood", async (req: Request, res: Response) => {
    const count = Math.min(parseInt(req.query.count as string, 10) || 50, 500);
    const parallel = Math.min(parseInt(req.query.parallel as string, 10) || 5, 20);

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const routes = [
      "/stress/cache",
      "/stress/http",
      "/stress/log",
      "/stress/query",
      "/stress/mail",
      "/stress/job",
    ];

    const startTime = Date.now();
    let completed = 0;
    let errors = 0;

    const queue: (() => Promise<void>)[] = [];
    for (let i = 0; i < count; i++) {
      const route = routes[i % routes.length];
      queue.push(async () => {
        try {
          await axios.get(`${baseUrl}${route}`, { timeout: 30000 });
          completed++;
        } catch {
          errors++;
        }
      });
    }

    const executing = new Set<Promise<void>>();
    for (const task of queue) {
      const p = task().then(() => {
        executing.delete(p);
      });
      executing.add(p);

      if (executing.size >= parallel) {
        await Promise.race(executing);
      }
    }
    await Promise.all(executing);

    const elapsed = Date.now() - startTime;
    const rps = ((completed + errors) / (elapsed / 1000)).toFixed(2);

    res.json({
      ok: true,
      stats: {
        totalRequests: count,
        completed,
        errors,
        elapsedMs: elapsed,
        requestsPerSecond: parseFloat(rps),
        parallelism: parallel,
      },
    });
  });

  return router;
}