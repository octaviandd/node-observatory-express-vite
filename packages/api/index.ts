/** @format */
/// <reference path="./types.d.ts" />
import "dotenv/config";
import "./src/patchers/cjs/index";
import Database from "./src/database-sql";
import { setupMigrations } from "./src/migrations/index";
import {
  LogWatcher,
  MailWatcher,
  JobWatcher,
  ScheduleWatcher,
  CacheWatcher,
  NotificationWatcher,
  RequestWatcher,
  HTTPClientWatcher,
  QueryWatcher,
  ExceptionWatcher,
  ViewWatcher,
  ModelWatcher,
} from "./src/watchers/index";
import { RedisClientType } from "redis";
import { Connection } from "mysql2";
import { Connection as PromiseConnection } from "mysql2/promise";
import apiRoutes from "./src/routes/routes";
import path from "path";

function instanceCreator(redisClient: RedisClientType, DBInstance: Database){ 
  watchers.requests = new RequestWatcher(redisClient, DBInstance);
  watchers.errors = new ExceptionWatcher(redisClient, DBInstance);
  watchers.http = new HTTPClientWatcher(redisClient, DBInstance);
  watchers.jobs = new JobWatcher(redisClient, DBInstance);
  watchers.logging = new LogWatcher(redisClient, DBInstance);
  watchers.scheduler = new ScheduleWatcher(redisClient, DBInstance);
  watchers.mailer = new MailWatcher(redisClient, DBInstance);
  watchers.cache = new CacheWatcher(redisClient, DBInstance);
  watchers.notifications = new NotificationWatcher(redisClient, DBInstance);
  watchers.query = new QueryWatcher(redisClient, DBInstance);
  watchers.view = new ViewWatcher(redisClient, DBInstance);
  watchers.model = new ModelWatcher(redisClient, DBInstance);
}

export const watchers: Record<string, any> = {};

/**
 * Initial entry point for setting up the logger
 * @param config - Configuration object for the logger
 * @param driver - The logging driver to use.
 * @param connection - Connection details for the logging service
 * @param redisClient - Redis client instance for caching and pub/sub functionality
 * @returns The configured logger instance with a success message
 */
export async function createObserver(
  serverAdapter: IServerAdapter,
  options: { uiBasePath?: string },
  driver: StoreDriver,
  connection: Connection | PromiseConnection,
  redisClient: RedisClientType,
): Promise<void> {
  // make callback based mysql2 into promises.
  // @ts-expect-error
  connection = connection.hasOwnProperty("Promise") ? connection : connection.promise();
  await setupMigrations(driver, connection as PromiseConnection);

  const DBInstance = new Database(connection as PromiseConnection);
  instanceCreator(redisClient, DBInstance);

  // looks for the module in node modules and returns the path of the package in node modules.
  const uiBasePath =
    options.uiBasePath || path.dirname(eval(`require.resolve('@node-observatory/ui/package.json')`));
  
  console.log(uiBasePath)

  const uiEntryRoute : AppViewRoute = {
    method: 'get',
    route: [
      '/',
      '/mails',
      '/mails/:key',
      '/mail/:id',
      '/exceptions',
      '/exceptions/:key',
      '/exception/:id',
      '/logs',
      '/logs/:key',
      '/log/:id',
      '/notifications',
      '/notifications/:key',
      '/notification/:id',
      '/jobs',
      '/jobs/:key',
      '/job/:id',
      '/caches',
      '/caches/:key',
      '/cache/:id',
      '/queries',
      '/queries/:key',
      '/query/:id',
      '/models',
      '/models/:key',
      '/model/:id',
      '/requests',
      '/requests/:key',
      '/request/:id',
      '/schedules',
      '/schedules/:key',
      '/schedule/:id',
      '/https',
      '/https/:key',
      '/http/:id',
      '/views',
      '/views/:key',
      '/view/:id'
    ],
    handler: ({ basePath }: { basePath: string }) => {
      return {
        name: path.join(uiBasePath, 'dist', 'index.html'), params: { basePath }
      }
    }
  }

  serverAdapter
    .setStaticPath('/', path.join(uiBasePath, 'dist'))
    .setStaticPath('/assets', path.join(uiBasePath, 'dist/assets'))
    .setEntryRoute(uiEntryRoute)
    .setApiRoutes(apiRoutes)
    .setErrorHandler((error : Error & { statusCode: HTTPStatus }) => ({
      status: error.statusCode || 500,
      body: {
        error: 'Internal server error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    }))

  console.log('Finish setup observatory')
}