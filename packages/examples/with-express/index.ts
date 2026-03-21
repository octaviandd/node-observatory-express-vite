/** @format */
import { createObserver } from "@node-observatory/api";
import { ExpressAdapter } from "@node-observatory/express";
import express from "express";
import cors from "cors";
import mysql2 from "mysql2/promise";
import { createClient, RedisClientType } from "redis";
import pino from "pino";
import path from "path";
import { readFile } from "fs/promises";

// Create Pino logger
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

export const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (!req.path.startsWith("/ui")) {
    return express.json()(req, res, next);
  }
  next();
});

const expressAdapter = new ExpressAdapter();
expressAdapter.setBasePath("/ui");
app.use("/ui", expressAdapter.getRouter());

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------
async function startServer() {
  const mysql2Connection = await mysql2.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306", 10),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "observatory",
  });

  const redisConnection = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

  await redisConnection.connect();

  const isDev = process.env.NODE_ENV === "development";

  await createObserver(
    expressAdapter,
    { devMode: isDev },
    "mysql2",
    mysql2Connection,
    redisConnection as RedisClientType,
  );

  if (isDev) {
    // In dev mode: use Vite in middleware mode so the UI gets full HMR.
    const { createServer: createViteServer } = await import("vite");
    const uiRoot = path.dirname(
      require.resolve("@node-observatory/ui/package.json"),
    );

    const vite = await createViteServer({
      root: uiRoot,
      server: { middlewareMode: true },
      appType: "custom",
    });

    // SPA fallback: intercept browser navigation requests to /ui/* BEFORE they
    // hit Vite's internal finalhandler (which would 404 them). Source file
    // requests (any path with a '.' or starting with '/@') fall through to Vite.
    app.use("/ui", async (req, res, next) => {
      const isAsset =
        req.path.includes(".") ||
        req.path.startsWith("/@") ||
        req.path.startsWith("/__");
      if (isAsset) return next();

      try {
        const raw = await readFile(path.join(uiRoot, "index.html"), "utf-8");
        const html = await vite.transformIndexHtml(req.originalUrl, raw);
        const configScript = `<script>window.SERVER_CONFIG = ${JSON.stringify({ base: "/ui" })};</script>`;
        res
          .status(200)
          .set({ "Content-Type": "text/html" })
          .end(html.replace("</body>", `${configScript}</body>`));
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });

    // Vite middleware handles source files, HMR WebSocket, and @vite/* requests.
    app.use(vite.middlewares);
  }

  logger.info("Server started");

  const PORT = 9999;
  app.listen(PORT, () => {
    logger.info({ port: PORT }, "Server is running");
  });
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, closing queue...");
  process.exit(0);
});

startServer().catch((error) => {
  logger.fatal({ error }, "Error starting the server");
  process.exit(1);
});
