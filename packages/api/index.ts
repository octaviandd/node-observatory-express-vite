/** @format */
import "dotenv/config";
import "./src/patchers/index";
import { mysql2Up } from "./src/migrations/index";
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
import { HTTPStatus, IServerAdapter, StoreDriver, AppViewRoute } from "./types";
import { createClient } from "redis";
import { Connection } from "mysql2";
import { Connection as PromiseConnection } from "mysql2/promise";
import apiRoutes from "./src/routes/routes";
import path from "path";

export const instanceCreator = (
  driver: StoreDriver,
  connection: Connection | PromiseConnection,
  redisClient: ReturnType<typeof createClient>,
  serverAdapter: IServerAdapter
) => ({
  logWatcherInstance: new LogWatcher(driver, connection, redisClient, serverAdapter),
  mailWatcherInstance: new MailWatcher(driver, connection, redisClient, serverAdapter),
  jobWatcherInstance: new JobWatcher(driver, connection, redisClient, serverAdapter),
  scheduleWatcherInstance: new ScheduleWatcher(driver, connection, redisClient, serverAdapter),
  cacheWatcherInstance: new CacheWatcher(driver, connection, redisClient, serverAdapter),
  notificationWatcherInstance: new NotificationWatcher(
    driver,
    connection,
    redisClient,
    serverAdapter
  ),
  requestWatcherInstance: new RequestWatcher(driver, connection, redisClient, serverAdapter),
  httpClientWatcherInstance: new HTTPClientWatcher(
    driver,
    connection,
    redisClient,
    serverAdapter
  ),
  queryWatcherInstance: new QueryWatcher(driver, connection, redisClient, serverAdapter),
  exceptionWatcherInstance: new ExceptionWatcher(
    driver,
    connection,
    redisClient,
    serverAdapter
  ),
  viewWatcherInstance: new ViewWatcher(driver, connection, redisClient, serverAdapter),
  modelWatcherInstance: new ModelWatcher(driver, connection, redisClient, serverAdapter),
});

export const watchers: any = {
  errors: null,
  requests: null,
  http: null,
  jobs: null,
  logging: null,
  scheduler: null,
  mailer: null,
  cache: null,
  notifications: null,
  query: null,
  command: null,
  view: null,
  model: null,
};

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
  redisClient: ReturnType<typeof createClient>,
): Promise<void> {
  // @ts-expect-error
  connection = connection.hasOwnProperty("Promise") ? connection : connection.promise();
  await setupMigrations(driver, connection as PromiseConnection);

  const {
    queryWatcherInstance,
    logWatcherInstance,
    mailWatcherInstance,
    jobWatcherInstance,
    notificationWatcherInstance,
    scheduleWatcherInstance,
    cacheWatcherInstance,
    requestWatcherInstance,
    httpClientWatcherInstance,
    exceptionWatcherInstance,
    viewWatcherInstance,
    modelWatcherInstance,
  } = instanceCreator(driver, connection, redisClient, serverAdapter);

  watchers.requests = requestWatcherInstance;
  watchers.errors = exceptionWatcherInstance;
  watchers.http = httpClientWatcherInstance;
  watchers.jobs = jobWatcherInstance;
  watchers.logging = logWatcherInstance;
  watchers.scheduler = scheduleWatcherInstance;
  watchers.mailer = mailWatcherInstance;
  watchers.cache = cacheWatcherInstance;
  watchers.notifications = notificationWatcherInstance;
  watchers.query = queryWatcherInstance;
  watchers.view = viewWatcherInstance;
  watchers.model = modelWatcherInstance;

  // looks for the module in node modules and returns the path of the package in node modules. 
  const uiBasePath =
    options.uiBasePath || path.dirname(eval(`require.resolve('@node-observatory/ui/package.json')`));

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
        name: "index.html", params: { basePath }
      }
    }
  }

  serverAdapter
    .setStaticPath('/', path.join(uiBasePath, 'dist'))
    .setStaticPath('/assets', path.join(uiBasePath, 'dist/assets'))
    .setViewsPath(path.join(uiBasePath, 'dist'))
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

/**
 * Setup the migrations depending on the database/storage driver.
 * @param driver - The database/storage driver to use.
 * @param connection - The connection details for the database/storage driver.
 */
async function setupMigrations(
  driver: StoreDriver,
  connection: PromiseConnection,
): Promise<void> {
  switch (driver) {
    case "mysql2":
      await mysql2Up(connection);
      break
    default:
      break
  }
}