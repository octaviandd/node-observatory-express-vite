declare global {
  namespace Express {
    interface Request {
      session?: {
        id: string;
        [key: string]: any;
      };
    }
  }
}
/**
 * Supported logging libraries
 * @typedef {string} Logger
 */
export type Logger =
  | "winston"
  | "pino"
  | "bunyan"
  | "log4js"
  | "signale"
  | "loglevel";

/**
 * Supported scheduler libraries
 * @typedef {string} Scheduler
 */
export type Scheduler = "node-schedule" | "node-cron" | "bree";

/**
 * Supported email sending libraries
 * @typedef {string} Mailer
 */
export type Mailer =
  | "nodemailer"
  | "@sendgrid/mail"
  | "mailgun.js"
  | "postmark"
  | "@aws-sdk/client-ses";

/**
 * Supported caching libraries
 * @typedef {string} Cache
 */
export type Cache =
  | "redis"
  | "ioredis"
  | "node-cache"
  | "lru-cache"
  | "memjs"
  | "level"
  | "keyv";

/**
 * Supported notification libraries
 * @typedef {string} Notifications
 */
export type Notifications =
  | "pusher"
  | "ably";

/**
 * Supported HTTP client libraries
 * @typedef {string} Http
 */
export type Http =
  | "axios"
  | "http"
  | "https"
  | "fetch"
  | "got"
  | "superagent"
  | "undici"
  | "ky"
  | "needle"
  | "phin"
  | "node-fetch";

/**
 * Supported job processing libraries
 * @typedef {string} Jobs
 */
export type Jobs = "bull" | "agenda";

/**
 * Types of error handling to observe
 * @typedef {string} Errors
 */
export type Errors = "uncaught" | "unhandled";

/**
 * Supported database query libraries
 * @typedef {string} Queries
 */
export type Queries =
  | "knex"
  | "sequelize"
  | "sqlite3"
  | "typeorm"
  | "prisma"
  | "mysql2"
  | "mysql"
  | "mongodb"
  | "pg";

/**
 * Supported ORM/model libraries
 * @typedef {string} Model
 */
export type Model = "typeorm" | "sequelize" | "prisma" | "knex" | "sqlite3";

/**
 * Supported view libraries
 * @typedef {string} Views
 */
export type Views = "ejs" | "pug" | "handlebars";

/**
 * Supported database drivers for storing logs and metrics
 * @typedef {string} StoreDriver
 */
export type StoreDriver = "mysql2";

/**
 * Interface representing standardized HTTP request data across different libraries
 * Common fields are required, library-specific fields are optional
 */
export interface HttpRequestData {
  // Common required fields
  method: string;
  origin: string;
  pathname: string;
  protocol: string;
  statusCode: number;
  statusMessage: string;
  duration: number;
  aborted: boolean;
  headers: Record<string, string | string[] | undefined>;
  responseBody: string | Buffer;
  responseBodySize: number;
  isMedia: boolean;
  library: string; // Which HTTP client library was used

  // Source information
  file: string;
  line: string;

  // Common optional fields with different representations
  host?: string;
  hostname?: string;
  path?: string;
  port?: string | number | null;

  // Library-specific optional fields
  // Axios specific
  maxRedirects?: number;
  maxBodyLength?: number | null;
  beforeRedirects?: Record<string, any>;

  // Got specific
  hooks?: {
    init?: any[];
    beforeError?: any[];
    beforeRetry?: any[];
    afterResponse?: any[];
    beforeRequest?: any[];
    beforeRedirect?: any[];
  };
  retry?: {
    limit?: number;
    methods?: string[];
    errorCodes?: string[];
    statusCodes?: number[];
    maxRetryAfter?: number | null;
  };
  pagination?: {
    backoff?: number;
    countLimit?: number | null;
    requestLimit?: number;
    stackAllItems?: boolean;
  };
  throwHttpErrors?: boolean;
  followRedirect?: boolean;
  methodRewriting?: boolean;
  resolveBodyOnly?: boolean;
  ignoreInvalidCookies?: boolean;

  // Node-fetch specific
  href?: string;
  slashes?: boolean;
  auth?: string | null;
  hash?: string | null;
  search?: string | null;
  query?: string | null;

  // Superagent specific
  agent?: boolean | any;
  rejectUnauthorized?: boolean;

  // Needle specific
  signal?: any;

  // URL components that might be represented differently
  url?: string | Record<string, any>;

  // Any other properties not explicitly defined
  [key: string]: any;
}

export interface ExceptionContent {
  type: "exception";
  message: string;
  stack: string;
  file: string;
  line: string;
  title: string;
  codeContext: {
    lineNumber: number;
    content: string;
    isErrorLine: boolean;
  }[];
  fullError: string;
}

export interface ViewContent {
  type: "view";
  view: string;
  cacheInfo: {
    cacheEnabled: boolean;
  };
  data: string;
  line: string;
  file: string;
  duration: number;
  size: number;
  status: "completed" | "failed";
  error: {
    message: string;
    name: string;
  } | null;
  package: "ejs" | "pug" | "handlebars";
  options: Record<string, any>;
}

export interface ScheduleContent {
  type: "schedule";
  package: "node-schedule" | "node-cron" | "bree";
  scheduleId: string;
  cronExpression: string;
  file: string;
  line: string;
  status: "completed" | "failed";
  jobId: string;
  nextInvocation?: string;
  newRule?: string;
  rule?: string;
  method?: string;
  name?: string;
  data?: Record<string, any>;
  error?: {
    message: string;
    name: string;
  } | null;
  duration?: number;
}

export interface JobContent {
  type: "job";
  method:
    | "process"
    | "add"
    | "retryJob"
    | "start"
    | "pause"
    | "resume"
    | "processJob";
  status: "started" | "processing" | "completed" | "failed" | "released";
  package: "bull" | "agenda";
  queue: string;
  connectionName: string;
  jobData?: Record<string, any>;
  attemptsMade?: number;
  failedReason?: string;
  returnValue?: any;
  jobId?: string;
  token?: string;
  file: string;
  line: string;
  duration?: number;
  error?: {
    message: string;
    name: string;
  } | null;
}

export interface LogContent {
  package: "bunyan" | "log4js" | "signale" | "loglevel";
  type: "log";
  level: "info" | "warn" | "error" | "debug" | "verbose" | "silly" | "log";
  message: string;
  file: string;
  line: string;
  duration?: number;
}

export interface NotificationContent {
  type: "notification";
  method: "trigger" | "triggerBatch";
  status: "completed" | "failed";
  channel?: string;
  event?: string;
  data?: Record<string, any>;
  options?: Record<string, any>;
  package: "pusher" | "ably";
  file: string;
  line: string;
  duration?: number;
  error?: {
    message: string;
    name: string;
  } | null;
  response?: Record<string, any>;
}

export interface MailContent {
  type: "mail";
  status: "completed" | "failed";
  file: string;
  line: string;
  info?: {
    messageId: string;
    response: string;
  } | null;
  package:
    | "nodemailer"
    | "postmark"
    | "@sendgrid/mail"
    | "mailgun.js"
    | "@aws-sdk/client-ses";
  duration?: number;
  command?: string;
  error?: {
    message: string;
    name: string;
  } | null;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  from?: string;
  subject?: string;
  text?: string;
  body?: string;
}

export interface CacheContent {
  type: "cache";
  package:
    | "redis"
    | "ioredis"
    | "node-cache"
    | "lru-cache"
    | "memjs"
    | "level"
    | "keyv";
  duration?: string;
  error?: {
    message: string;
    name: string;
  } | null;
  file: string;
  line: string;
  result?: any;
  hits: number;
  misses: number;
  writes: number;
  key?: string;
  value?: any;
  checkPeriod?: number;
  stdTTL?: number;
}
export interface QueryContent {
  type: "query";
  context: string;
  sql: string;
  duration: number;
  hostname: string;
  port: string;
  database: string;
  package:
    | "mysql2"
    | "pg"
    | "sequelize"
    | "knex"
    | "prisma"
    | "sqlite3"
    | "typeorm";
  error?: {
    message: string;
    name: string;
  } | null;
  file: string;
  line: string;
  status: "completed" | "failed";
  sqlType: string;
  params?: any;
}
export interface ModelContent {
  type: "model";
  method:
    | "create"
    | "find"
    | "findById"
    | "findByPk"
    | "findAll"
    | "update"
    | "destroy"
    | "count"
    | "sum"
    | "min"
    | "max"
    | "avg"
    | "median"
    | "mode"
    | "group"
    | "groupBy"
    | "groupByCount"
    | "groupBySum"
    | "groupByMin"
    | "groupByMax"
    | "groupByAvg"
    | "groupByMedian"
    | "groupByMode";
  status: "completed" | "failed";
  package: "sequelize" | "knex" | "prisma" | "sqlite3" | "typeorm";
  modelName: string;
  arguments: any[];
  result: any;
  file: string;
  line: string;
  duration?: number;
  error?: {
    message: string;
    name: string;
  } | null;
}
export interface RequestContent {
  type: "request";
  method: string;
  route: string;
  statusCode: number;
  duration: number;
  headers: Record<string, string>;
  query: Record<string, string>;
  params: Record<string, string>;
  ip: string;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  payload: any;
  responseSize: number;
  requestSize: number;
  session: Record<string, any>;
  package: "express";
  file: string;
  line: string;
}

export interface HttpClientContent {
  type: "http";
  method: string;
  route: string;
  statusCode: number;
  duration: number;
  headers: Record<string, string>;
  query: Record<string, string>;
  params: Record<string, string>;
  responseBody: string;
  responseBodySize: number;
  requestBody: string;
  requestBodySize: number;
  responseHeaders: Record<string, string>;
  href?: string;
  slashes?: boolean;
  auth?: string | null;
  hash?: string | null;
  search?: string | null;
  origin?: string;
  pathname?: string;
  path?: string;
  protocol?: string;
  statusMessage?: string;
  aborted?: boolean;
  fullUrl?: string;
  line: string;
  file: string;
  package: string;
}

export interface ClientResponse {
  uuid: string;
  request_id?: string;
  job_id?: string;
  schedule_id?: string;
  created_at: string;
  updated_at: string;
  type:
    | "view"
    | "exception"
    | "request"
    | "model"
    | "cache"
    | "job"
    | "query"
    | "log"
    | "notification"
    | "mail"
    | "schedule"
    | "http";
  content:
    | ViewContent
    | ExceptionContent
    | RequestContent
    | ModelContent
    | CacheContent
    | JobContent
    | QueryContent
    | LogContent
    | NotificationContent
    | MailContent
    | ScheduleContent
    | HttpClientContent;
}

export interface BaseGroupResponse {
  count: number;
  shortest?: number;
  longest?: number;
  average?: number;
  p95?: number;
}

export interface CacheGroupResponse extends BaseGroupResponse {
  misses: number;
  hits: number;
  writes: number;
  cache_key: string;
}

export interface ExceptionGroupResponse extends BaseGroupResponse {
  header: string;
  total: number;
}

export interface CacheInstanceResponse extends ClientResponse {
  content: CacheContent;
}

export interface RequestInstanceResponse extends ClientResponse {
  content: RequestContent;
}

export interface JobInstanceResponse extends ClientResponse {
  content: JobContent;
}

export interface ScheduleInstanceResponse extends ClientResponse {
  content: ScheduleContent;
}

export interface ViewInstanceResponse extends ClientResponse {
  content: ViewContent;
}

export interface ExceptionInstanceResponse extends ClientResponse {
  content: ExceptionContent;
}

export interface HttpClientInstanceResponse extends ClientResponse {
  content: HttpClientContent;
}

export interface MailInstanceResponse extends ClientResponse {
  content: MailContent;
}

export interface LogInstanceResponse extends ClientResponse {
  content: LogContent;
}

export interface NotificationInstanceResponse extends ClientResponse {
  content: NotificationContent;
}

export interface QueryInstanceResponse extends ClientResponse {
  content: QueryContent;
  average: number;
  p95: number;
}

export interface ModelInstanceResponse extends ClientResponse {
  content: ModelContent;
}

export interface HttpClientGroupResponse extends BaseGroupResponse {
  route: string;
  average: number;
  p95: number;
  count_200: number;
  count_400: number;
  count_500: number;
}

export interface JobGroupResponse extends BaseGroupResponse {
  queue: string;
  completed: number;
  released: number;
  failed: number;
}

export interface RequestGroupResponse extends BaseGroupResponse {
  route: string;
  count_200: number;
  count_400: number;
  count_500: number;
  average: number;
  p95: number;
}

export interface LogGroupResponse extends BaseGroupResponse {
  level: string;
  message: string;
  info: number;
  warn: number;
  error: number;
  debug: number;
  trace: number;
  fatal: number;
  log: number;
}
export interface MailGroupResponse extends BaseGroupResponse {
  mail_to: string;
  success_count: number;
  failed_count: number;
}

export interface ModelGroupResponse extends BaseGroupResponse {
  modelName: string;
}

export interface NotificationGroupResponse extends BaseGroupResponse {
  channel: string;
  completed: number;
  failed: number;
}

export interface QueryGroupResponse extends BaseGroupResponse {
  endpoint: string;
  completed: number;
  failed: number;
  p95: number;
  average: number;
}

export interface ViewGroupResponse extends BaseGroupResponse {
  size: string;
  view: string;
  completed: number;
  failed: number;
}

export interface ScheduleGroupResponse extends BaseGroupResponse {
  scheduleId: string;
  cronExpression: string;
  completed: number;
  failed: number;
}

export type HTTPMethod = 'get' | 'post' | 'put' | 'patch';
export type HTTPStatus = number;

interface AppControllerRoute {
  method: HTTPMethod | HTTPMethod[];
  route: string | string[];

  handler(request?: ObservatoryBoardRequest): Promisify<ControllerHandlerReturnType>;
}

export type ViewHandlerReturnType = {
  name: string;
  params: Record<string, string>;
};

export interface AppViewRoute {
  method: HTTPMethod;
  route: string | string[];

  handler(params: { basePath: string }): ViewHandlerReturnType;
}

export type Promisify<T> = T | Promise<T>

export type ControllerHandlerReturnType = {
  status?: HTTPStatus;
  body: string | Record<string, any>;
};

export interface ObservatoryBoardRequest {
  requestData: any;
  query: Record<string, any>;
  params: Record<string, any>;
  body: Record<string, any>;
}

export interface SidePanelState {
  requestId?: string;
  jobId?: string;
  scheduleId?: string;
  modelId?: string;
  isOpen: boolean;
}

export interface IServerAdapter {
  setViewsPath(viewPath: string): IServerAdapter;
  setStaticPath(staticsRoute: string, staticsPath: string): IServerAdapter;
  setEntryRoute(route: AppViewRoute): IServerAdapter;
  setErrorHandler(handler: (error: Error & { statusCode : HTTPStatus }) => ControllerHandlerReturnType): IServerAdapter;
  setApiRoutes(routes: AppControllerRoute[]): IServerAdapter;
}
