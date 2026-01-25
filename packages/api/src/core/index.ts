/** @format */
/// <reference path="../../types.d.ts" />
import "dotenv/config";
import path from "path";
import type { RedisClientType } from "redis";
import type { Connection } from "mysql2";
import type { Connection as PromiseConnection } from "mysql2/promise";
import { resolvePackagePath } from "./helpers/helpers.js";
import Database from "./databases/sql/Base.js";
import { setupMigrations } from "./databases/migrations/index.js";
import apiRoutes from "./routes/routes.js";
import { BaseWatcher } from "./watchers/BaseWatcher.js";
import { GenericWatcher } from "./watchers/index.js";
import { WATCHER_CONFIGS } from "./watcherConfig.js";

export const patchedGlobal = global as typeof globalThis & { [key: symbol]: boolean | undefined };
export const watchers: Record<string, BaseWatcher> = {};

const WATCHER_ROUTE_MAP = {
  requests: 'request',
  errors: 'exception',
  http: 'http',
  jobs: 'job',
  logging: 'log',
  scheduler: 'schedule',
  mailer: 'mail',
  cache: 'cache',
  notifications: 'notification',
  query: 'query',
  view: 'view',
  model: 'model',
} as const;

function initializeWatchers(redis: RedisClientType, db: Database) {
  for (const [routeKey, configKey] of Object.entries(WATCHER_ROUTE_MAP)) {
    const config = WATCHER_CONFIGS[configKey as keyof typeof WATCHER_CONFIGS];
    watchers[routeKey] = new GenericWatcher(redis, db, config);
  }
}

const UI_RESOURCES = [
  { plural: 'mails', singular: 'mail' },
  { plural: 'exceptions', singular: 'exception' },
  { plural: 'logs', singular: 'log' },
  { plural: 'notifications', singular: 'notification' },
  { plural: 'jobs', singular: 'job' },
  { plural: 'caches', singular: 'cache' },
  { plural: 'queries', singular: 'query' },
  { plural: 'models', singular: 'model' },
  { plural: 'requests', singular: 'request' },
  { plural: 'schedules', singular: 'schedule' },
  { plural: 'https', singular: 'http' },
  { plural: 'views', singular: 'view' },
] as const;

function generateUIRoutes(): string[] {
  const routes = ['/'];
  for (const { plural, singular } of UI_RESOURCES) {
    routes.push(`/${plural}`, `/${plural}/:key`, `/${singular}/:id`);
  }
  return routes;
}

export async function createObserver(
  serverAdapter: IServerAdapter,
  options: { uiBasePath?: string },
  driver: StoreDriver,
  connection: Connection | PromiseConnection,
  redisClient: RedisClientType,
): Promise<void> {
  // Ensure promise-based connection
  const promiseConnection: PromiseConnection = 
    'promise' in connection && typeof connection.promise === 'function'
      ? connection.promise()
      : (connection as PromiseConnection);
  
  await setupMigrations(driver, promiseConnection);
  initializeWatchers(redisClient, new Database(promiseConnection));

  const uiDistPath = options.uiBasePath || path.dirname(resolvePackagePath('@node-observatory/ui/package.json'));

  serverAdapter
    .setStaticPath('/', path.join(uiDistPath, 'dist'))
    .setStaticPath('/assets', path.join(uiDistPath, 'dist/assets'))
    .setEntryRoute({
      method: 'get',
      route: generateUIRoutes(),
      handler: ({ basePath }) => ({
        name: path.join(uiDistPath, 'dist', 'index.html'),
        params: { basePath },
      }),
    })
    .setApiRoutes(apiRoutes)
    .setErrorHandler((error: Error & { statusCode: HTTPStatus }) => ({
      status: error.statusCode || 500,
      body: {
        error: 'Internal server error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    }));
  
  console.log('Observatory setup complete');
}