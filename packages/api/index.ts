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
<<<<<<< HEAD
import { HTTPStatus, IServerAdapter, StoreDriver } from "./types";
=======
import { StoreDriver } from "./types";
>>>>>>> ee8ae814172fe3eb70daa563f8d52c2200af9c5d
import { createClient } from "redis";
import { Connection } from "mysql2";
import { Connection as PromiseConnection } from "mysql2/promise";
import apiRoutes from "src/routes/routes";
<<<<<<< HEAD
import path from "path";
import { AppViewRoute } from "./types";
=======
>>>>>>> ee8ae814172fe3eb70daa563f8d52c2200af9c5d

export const instanceCreator = (
  driver: StoreDriver,
  connection: Connection | PromiseConnection,
  redisClient: ReturnType<typeof createClient>,
<<<<<<< HEAD
  serverAdapter: IServerAdapter
=======
  serverAdapter: any
>>>>>>> ee8ae814172fe3eb70daa563f8d52c2200af9c5d
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
<<<<<<< HEAD
=======
  redisWatcherInstance: new RedisWatcher(driver, connection, redisClient, serverAdapter),
>>>>>>> ee8ae814172fe3eb70daa563f8d52c2200af9c5d
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
<<<<<<< HEAD
export async function createObserver(
  serverAdapter: IServerAdapter,
  options: any,
=======
export async function NodeObserver(
  serverAdapter: any,
>>>>>>> ee8ae814172fe3eb70daa563f8d52c2200af9c5d
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
<<<<<<< HEAD
=======

  serverAdapter.setApiRoutes(apiRoutes);
>>>>>>> ee8ae814172fe3eb70daa563f8d52c2200af9c5d

  watchers.requests = requestWatcherInstance;
  process.env.NODE_OBSERVATORY_ERRORS &&
    (watchers.errors = exceptionWatcherInstance);
  process.env.NODE_OBSERVATORY_HTTP &&
    (watchers.http = httpClientWatcherInstance);
  process.env.NODE_OBSERVATORY_JOBS && (watchers.jobs = jobWatcherInstance);
  process.env.NODE_OBSERVATORY_LOGGING &&
    (watchers.logging = logWatcherInstance);
  process.env.NODE_OBSERVATORY_SCHEDULER &&
    (watchers.scheduler = scheduleWatcherInstance);
  process.env.NODE_OBSERVATORY_MAILER &&
    (watchers.mailer = mailWatcherInstance);
  process.env.NODE_OBSERVATORY_CACHE && (watchers.cache = cacheWatcherInstance);
  process.env.NODE_OBSERVATORY_NOTIFICATIONS &&
    (watchers.notifications = notificationWatcherInstance);
  process.env.NODE_OBSERVATORY_QUERIES &&
    (watchers.query = queryWatcherInstance);
  process.env.NODE_OBSERVATORY_VIEWS && (watchers.view = viewWatcherInstance);
  process.env.NODE_OBSERVATORY_MODELS &&
    (watchers.model = modelWatcherInstance);
<<<<<<< HEAD
  
  // looks for the module in node modules and returns the path of the package in node modules. 
  const uiBasePath =
    options.uiBasePath || path.dirname(eval(`require.resolve('@node-observatory/ui/package.json')`));
  
  const uiEntryRoute : AppViewRoute = {
    method: 'get',
    route: '/',
    handler: ({ basePath }: { basePath: string }) => {
      return {
        name: "index.html", params: { basePath }
      }
    }
  }
  
  serverAdapter
    .setViewsPath(path.join(uiBasePath, 'dist'))
    .setStaticPath('static' , path.join(uiBasePath, 'dist/assets'))
    .setEntryRoute(uiEntryRoute)
    .setErrorHandler((error : Error & { statusCode: HTTPStatus }) => ({
    status: error.statusCode || 500,
    body: {
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
    }))
    .setApiRoutes(apiRoutes)
=======
>>>>>>> ee8ae814172fe3eb70daa563f8d52c2200af9c5d
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