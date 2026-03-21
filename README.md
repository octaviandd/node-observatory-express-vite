<!-- @format -->

# Node Observatory

Zero-config observability for Node.js apps. Drop it in, connect your database and Redis, and get a live dashboard for HTTP requests, database queries, jobs, cache operations, logs, emails, exceptions, and more — without changing your application code.

---

## How it works

Node Observatory monkey-patches the libraries you already use at startup. Events flow into Redis streams, get persisted to MySQL, and the built-in dashboard reads from that store. Nothing in your business logic changes.

```
Your app
  └── Patchers (shimmer/require-in-the-middle)
        └── Redis streams (per watcher type)
              └── MySQL (observatory_entries)
                    └── REST API + React dashboard
```

---

## Requirements

- Node.js 20+
- MySQL 8+
- Redis 6+
- Express 4 or 5

---

## Installation

```bash
npm install @node-observatory/api @node-observatory/express
```

---

## Quick Start

This must go at the **top** of your entry file, before any other imports. The patchers instrument libraries at load time, so import order matters.

```typescript
import { createObserver } from "@node-observatory/api";
import { ExpressAdapter } from "@node-observatory/express";
import express from "express";
import mysql2 from "mysql2/promise";
import { createClient } from "redis";

const app = express();
app.use(express.json());

const db = await mysql2.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: "UTC",
});

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const adapter = new ExpressAdapter();
adapter.setBasePath("/observatory");
app.use("/observatory", adapter.getRouter());

await createObserver(adapter, { uiBasePath: undefined }, "mysql2", db, redis);

app.listen(3000);
// Dashboard: http://localhost:3000/observatory
// API:       http://localhost:3000/observatory/api/dashboard
```

---

## Environment variables

Copy `.env.example` and set what you need. All `NODE_OBSERVATORY_*` variables are optional — they narrow which libraries get instrumented. Omitting them instruments everything.

```env
# Infrastructure
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=observatory
REDIS_HOST=localhost
REDIS_PORT=6379

# Instrumentation scope (JSON arrays or true/false)
NODE_OBSERVATORY_ERRORS=true
NODE_OBSERVATORY_ERROR_TRACING=true
NODE_OBSERVATORY_QUERIES=["mysql2","typeorm","sequelize"]
NODE_OBSERVATORY_MODELS=["typeorm","sequelize","mongoose"]
NODE_OBSERVATORY_LOGGING=["winston","pino","bunyan","log4js","signale","loglevel"]
NODE_OBSERVATORY_CACHE=["node-cache","redis","ioredis","memjs","level","keyv"]
NODE_OBSERVATORY_HTTP=["http","axios","fetch","got","superagent","undici","ky","needle","phin","node-fetch"]
NODE_OBSERVATORY_JOBS=["bull","agenda"]
NODE_OBSERVATORY_SCHEDULER=["node-schedule","node-cron"]
NODE_OBSERVATORY_MAILER=["nodemailer","@aws-sdk/client-ses","mailgun.js","postmark","sendgrid"]
NODE_OBSERVATORY_NOTIFICATIONS=["pusher","ably"]
NODE_OBSERVATORY_VIEWS=["handlebars","pug","ejs"]

# Third-party credentials (only needed if you instrument those services)
SENDGRID_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
ABLY_API_KEY=
POSTMARK_API_KEY=
MAILGUN_API_KEY=
```

---

## What gets instrumented

| Category         | Libraries                                                                |
| ---------------- | ------------------------------------------------------------------------ |
| Web framework    | Express                                                                  |
| Database drivers | mysql2, pg, mongodb, mongoose, knex, prisma, typeorm, sequelize, sqlite3 |
| Logging          | winston, pino, bunyan, log4js, loglevel, signale                         |
| Job queues       | bull, agenda, bree                                                       |
| Schedulers       | node-cron, node-schedule                                                 |
| Caching          | redis, ioredis, node-cache, lru-cache, memjs, level, keyv                |
| Outgoing HTTP    | node http/https, axios, undici, fetch, got, superagent, needle, phin     |
| Notifications    | pusher, ably                                                             |
| Email            | nodemailer, sendgrid, mailgun, aws ses, postmark                         |
| Exceptions       | uncaughtException, unhandledRejection                                    |
| Views            | handlebars, pug, ejs                                                     |

---

## Dashboard

The dashboard is served at the base path you mount the adapter on. It includes:

- **Overview** — request throughput, error rate, slow requests and queries, job activity.
- **Requests** — per-route grouping, status code breakdown, P95/avg/min/max latency.
- **Queries** — SQL grouped by statement, timing, and failure rates.
- **Jobs** — queue-level grouping, completed/failed/released counts.
- **Logs** — level-bucketed log volume, full log context.
- **Exceptions** — uncaught and unhandled rejections with stack traces and inline code context.
- **Cache** — hit/miss/write rates per key and library.
- **HTTP client** — outgoing calls grouped by origin, status code breakdown.
- **Mail** — send attempts, delivery outcomes.
- **Schedules** — cron/schedule runs, pass/fail rates.
- **Models** — ORM operation counts and timing.
- **Notifications** — Pusher/Ably trigger volume and outcomes.
- **Views** — template render timing.

All screens support instance view (single event detail) and grouped view (aggregated by relevant key), with configurable time windows: 1h, 24h, 7d, 14d, 30d.

---

## API endpoints

Once mounted, the following REST endpoints are available under your base path:

```
GET  /api/dashboard
GET  /api/{resource}/table
GET  /api/{resource}/count-graph
GET  /api/{resource}/duration-graph
GET  /api/{resource}/:id
POST /api/{resource}/:id/related
GET  /api/{resource}/refresh
```

Resources: `requests`, `queries`, `logs`, `exceptions`, `jobs`, `schedules`, `https`, `cache`, `mails`, `notifications`, `models`, `views`.

---

## Package structure

| Package            | npm name                    | Purpose                                                            |
| ------------------ | --------------------------- | ------------------------------------------------------------------ |
| `packages/api`     | `@node-observatory/api`     | Core runtime, patchers, Redis streams, SQL persistence, API routes |
| `packages/express` | `@node-observatory/express` | Express server adapter                                             |
| `packages/ui`      | `@node-observatory/ui`      | Compiled React dashboard (shipped as static assets)                |

---

## Telemetry storage

All events land in a single `observatory_entries` MySQL table with a JSON `content` column. The schema is intentionally flexible: adding a new patcher does not require a migration. The dashboard derives all aggregations at query time.

| Column        | Type                  | Notes                                              |
| ------------- | --------------------- | -------------------------------------------------- |
| `id`          | BIGINT AUTO_INCREMENT | Internal row identity                              |
| `uuid`        | CHAR(36)              | Stable public event ID                             |
| `request_id`  | CHAR(36)              | Links event to parent HTTP request                 |
| `job_id`      | CHAR(36)              | Links event to parent job execution                |
| `schedule_id` | CHAR(36)              | Links event to parent schedule run                 |
| `type`        | VARCHAR(20)           | Watcher type: request, query, log, exception, etc. |
| `content`     | JSON                  | Full normalized payload                            |
| `created_at`  | TIMESTAMP(6)          | Microsecond precision                              |

Indexes exist on uuid, request_id, job_id, schedule_id, type, and created_at.

---

## Correlation

Events are automatically correlated across watcher types within the same request or job lifecycle using `AsyncLocalStorage`. When you view a single HTTP request in the dashboard, related queries, logs, cache operations, and exceptions that occurred during that request are surfaced alongside it.

---

## License

Proprietary © 2025 Octavian David. See [LICENSE.txt](LICENSE.txt).
