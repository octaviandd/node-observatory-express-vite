<!-- @format -->

# @node-observatory/express

An Express.js server adapter for [Node Observatory](https://github.com/octaviandd/node-observatory-vite-express) — a real-time monitoring dashboard for Node.js applications.

## Installation

```bash
npm install @node-observatory/express @node-observatory/api
```

## Quick Start

```ts
import { createObserver } from "@node-observatory/api";
import { ExpressAdapter } from "@node-observatory/express";
import express from "express";
import mysql2 from "mysql2/promise";
import { createClient } from "redis";

const app = express();

// Set up your DB and Redis connections
const connection = await mysql2.createConnection({
  /* ...options */
});
const redisClient = createClient();
await redisClient.connect();

// Mount the Observatory UI at /ui
const expressAdapter = new ExpressAdapter();
expressAdapter.setBasePath("/ui");
app.use("/ui", expressAdapter.getRouter());

// Initialize the observer
await createObserver(
  expressAdapter,
  { uiBasePath: undefined },
  "mysql2",
  connection,
  redisClient,
);

app.listen(3000, () => console.log("Server running on port 3000"));
```

Navigate to `http://localhost:3000/ui` to open the dashboard.

## How It Works

`ExpressAdapter` implements the `IServerAdapter` interface expected by `@node-observatory/api`. When `createObserver` is called it:

1. Runs database migrations.
2. Initialises watchers for every monitored resource.
3. Calls the methods below on the adapter to wire up static assets, API routes, the SPA entry point, and a global error handler — all under your chosen base path.

## API

### `new ExpressAdapter()`

Creates a new adapter that wraps a fresh Express application instance.

### `.setBasePath(path: string): ExpressAdapter`

Sets the URL prefix under which the dashboard is mounted (e.g. `"/ui"`). Returns `this` for chaining.

### `.setStaticPath(route: string, dir: string): ExpressAdapter`

Serves a directory of static files at `route`. Redirect and index auto-serving are disabled so the SPA router stays in control. Returns `this` for chaining.

### `.serveHtmlFile(route: string, filePath: string): ExpressAdapter`

Registers a `GET` handler that sends a single HTML file. Returns `this` for chaining.

### `.setApiRoutes(routes: AppControllerRoute[]): ExpressAdapter`

Mounts a JSON API router for all Observatory data endpoints. Each route descriptor provides `method`, `route`, and `handler`. Async handlers are wrapped so errors propagate to Express's error-handling pipeline. Returns `this` for chaining.

### `.setEntryRoute(routeDef: AppViewRoute): ExpressAdapter`

Registers the SPA catch-all route(s). Before sending `index.html`, the adapter injects a `window.SERVER_CONFIG` script block containing the base path so the frontend knows where it is mounted. Returns `this` for chaining.

### `.setErrorHandler(handler): ExpressAdapter`

Registers a custom error handler that maps thrown errors (including `statusCode`) to a `{ status, body }` response shape. Returns `this` for chaining.

### `.getRouter(): Express`

Returns the underlying Express application so it can be mounted on a parent app via `app.use(basePath, adapter.getRouter())`.

## What Observatory Monitors

The package works alongside `@node-observatory/api`, which instruments the following libraries automatically via monkey-patching:

| Category          | Libraries                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------- |
| **HTTP requests** | `axios`, `node-fetch`, native `http`, `undici`                                           |
| **Databases**     | `mysql`, `mysql2`, `pg`, `mongoose`, `prisma`, `sequelize`, `typeorm`, `knex`, `sqlite3` |
| **Caching**       | `redis`, `ioredis`, `node-cache`, `memjs`, `keyv`, `lru-cache`, `level`                  |
| **Queues / jobs** | `bull`, `agenda`, `bree`                                                                 |
| **Schedulers**    | `node-cron`, `node-schedule`                                                             |
| **Mailers**       | `nodemailer`, `sendgrid`, `mailgun`, `postmark`, `aws-ses`                               |
| **Notifications** | `pusher`, `ably`                                                                         |
| **Logging**       | `pino`, `winston`, `bunyan`, `log4js`, `loglevel`, `signale`                             |
| **Express**       | Incoming HTTP request tracking                                                           |

## Requirements

- Node.js ≥ 18
- Express 4 or 5
- A MySQL-compatible database (MySQL 8 / MariaDB)
- Redis

## License

MIT
