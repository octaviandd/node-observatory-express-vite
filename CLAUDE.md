# CLAUDE.md - Node Observatory

## Project Overview

Node Observatory is a comprehensive observability and monitoring solution for Node.js applications. It automatically instruments servers, databases, APIs, and infrastructure without code changes using monkey-patching techniques.

## Architecture

**Monorepo Structure** using npm workspaces:

```
packages/
├── api/          # @node-observatory/api - Core instrumentation engine
├── ui/           # @node-observatory/ui - React dashboard
├── express/      # @node-observatory/express - Express.js adapter
└── examples/     # Reference implementations
    └── with-express/
```

**Data Flow:**
1. Patchers intercept library calls via monkey-patching
2. Events pushed to Redis streams (`observatory:stream:{type}`)
3. Watchers consume from Redis with consumer groups
4. Data batched and inserted into MySQL
5. API serves data to React frontend via REST
6. Frontend fetches via TanStack React Query

## Packages

### @node-observatory/api (`packages/api`)
Core instrumentation engine. Monitors 40+ libraries.

**Key Directories:**
- `src/core/` - Main logic, watchers, database, routes
- `src/patchers/cjs/` - CommonJS patchers (43 files)
- `src/patchers/esm/` - ES Module patchers (43 files)
- `src/patchers/shared/` - Common patcher logic

**12 Watchers** in `src/core/watchers/`:
- RequestWatcher, ExceptionWatcher, QueryWatcher, CacheWatcher
- MailWatcher, JobWatcher, ScheduleWatcher, HTTPClientWatcher
- NotificationWatcher, LogWatcher, ViewWatcher, ModelWatcher

**Build Output:**
- CommonJS: `dist/cjs/index.cjs.js`
- ES Modules: `dist/esm/index.esm.js`

### @node-observatory/ui (`packages/ui`)
React-based monitoring dashboard.

**Stack:** React 19, Vite 6.3, TanStack Query v5, Radix UI, Tailwind CSS 4.1, Recharts

**Key Files:**
- `src/App.tsx` - Main layout with sidebar
- `src/store.tsx` - Period/theme context
- `src/screens/` - 12 screen modules (request, exception, query, etc.)
- `src/hooks/useApi.ts` - React Query wrapper

### @node-observatory/express (`packages/express`)
Express.js adapter for integrating Observatory.

**Usage:**
```typescript
const expressAdapter = new ExpressAdapter();
expressAdapter.setBasePath('/ui');
app.use('/ui', expressAdapter.getRouter());
await createObserver(expressAdapter, options, driver, connection, redisClient);
```

## Commands

```bash
# Development
npm run dev:all          # Run API, UI, and example concurrently
npm run dev:api          # API only
npm run dev:ui           # UI only (Vite dev server)

# Building
npm run build            # Build all packages
npm run build:api        # API only
npm run build:ui         # UI only

# Testing
npm run test             # All tests
npm run test:unit        # Unit tests
npm run test:integration # Integration tests (Docker required)
npm run test:docker:up   # Start test Docker services
npm run test:docker:down # Stop test Docker services

# Code Quality
npm run lint             # Lint all packages
npm run typecheck        # TypeScript check
npm run clean            # Clean dist folders
```

## Database Schema

**Primary Table:** `observatory_entries`

```sql
CREATE TABLE observatory_entries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  request_id CHAR(36) NULL,
  job_id CHAR(36) NULL,
  schedule_id CHAR(36) NULL,
  type VARCHAR(20) NOT NULL,     -- request, exception, query, cache, mail, etc.
  content JSON NOT NULL,          -- All entry data as JSON
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),

  INDEX idx_uuid, idx_request_id, idx_job_id, idx_schedule_id, idx_type, idx_created_at
);
```

## API Routes

Base path: `/api`

| Endpoint | Description |
|----------|-------------|
| `GET /api/` | Dashboard overview |
| `GET /api/requests` | List HTTP requests |
| `GET /api/requests/:id` | Request detail |
| `GET /api/queries` | Database queries |
| `GET /api/exceptions` | Errors/exceptions |
| `GET /api/jobs` | Background jobs |
| `GET /api/schedules` | Scheduled tasks |
| `GET /api/cache` | Cache operations |
| `GET /api/mails` | Email sends |
| `GET /api/https` | Outbound HTTP |
| `GET /api/logs` | Application logs |
| `GET /api/views` | Template renders |
| `GET /api/models` | ORM operations |
| `GET /api/notifications` | Push notifications |

**Query Params:** `period`, `startDate`, `endDate`, `q`, `offset`, `limit`, `status`, `key`, `index`

## Supported Libraries

**Databases:** MySQL2, PostgreSQL, MongoDB, SQLite3, Prisma, TypeORM, Sequelize, Mongoose, Knex

**Cache:** Redis, IORedis, Node-Cache, LRU-Cache, Level, Keyv, Memjs

**HTTP Clients:** Axios, Got, Superagent, Fetch, Undici, native HTTP/HTTPS

**Logging:** Winston, Pino, Bunyan, Log4js, Signale, Loglevel

**Jobs:** Bull, Agenda, Bree

**Schedulers:** Node-Schedule, Node-Cron

**Email:** Nodemailer, SendGrid, Mailgun, AWS SES, Postmark

**Messaging:** Pusher, Ably

**Views:** Handlebars, Pug, EJS

## Key Technical Patterns

### Patcher Pattern
Files in `src/patchers/{cjs,esm}/patch-{library}.ts`:
- Use `require-in-the-middle` (CJS) or `import-in-the-middle` (ESM)
- Symbol markers prevent double-patching
- Shared logic in `src/patchers/shared/`

### Watcher Pattern
All watchers extend `BaseWatcher` and implement:
- `getTableData()` - Paginated listings
- `getViewData()` - Single entry detail
- `getGraphData()` - Time-series metrics

### Context Propagation
Uses `AsyncLocalStorage` in `src/core/store.ts` for:
- Request context (`requestStorage`)
- Job context (`jobStorage`)
- Schedule context (`scheduleStorage`)

### Redis Streams
- Consumer groups: `observatory:group:{type}`
- Streams: `observatory:stream:{type}`
- Auto-trims to 1000 entries
- Batched consumption with acknowledgment

## Configuration

**Environment Variables:**
```bash
NODE_ENV=development|production
LOG_LEVEL=info
LOGS_DIR=./logs
SERVER_PORT=3000

# Feature toggles (JSON arrays of library names)
NODE_OBSERVATORY_ERRORS=true
NODE_OBSERVATORY_JOBS=["bull"]
NODE_OBSERVATORY_CACHE=["redis","node-cache"]
NODE_OBSERVATORY_QUERIES=["mysql2"]
# ... etc
```

## TypeScript Config

- Target: ES2022
- Strict mode enabled
- Dual build: CJS (`tsconfig.cjs.json`) and ESM (`tsconfig.esm.json`)
- Declaration files generated

## Testing

- **Framework:** Jest (API), Vitest (UI)
- **Integration tests:** Require Docker (`docker-compose.test.yml`)
- **Coverage thresholds:** 70% branches, 80% functions/lines/statements

## Current Branch: `vibe-it`

Working branch for Redis streams implementation. Recent work:
- Redis streams consumer groups
- ESM Symbol constants
- Request data flow fixes

## File Naming Conventions

- Patchers: `patch-{library}.ts`
- Watchers: `{Type}Watcher.ts`
- UI screens: `src/screens/{type}/index.tsx`, `view.tsx`
- Constants: `src/core/helpers/constants.ts`

## Error Handling

Custom error classes in `src/core/helpers/errors/`:
- `MigrationError`
- `DatabaseRetrieveError`
- `RedisError`

## Notes

- Proprietary license for @node-observatory/api
- MIT license for UI and Express packages
- Base UI path: `/ui`
- Vite proxies API requests in development
