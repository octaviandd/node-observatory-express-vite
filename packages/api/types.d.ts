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

interface WatcherEntry {
  uuid: string;
  // closureId: string
  requestId?: string;
  jobId?: string;
  scheduleId?: string;
  type: string;
  content: string;
  created_at: number | Date;
}

interface WatcherFilters {
  period?: "1h" | "24h" | "7d" | "14d" | "30d";
  offset: number;
  limit: number;
  isTable: boolean;
  query?: string;
  index: string;
}

interface ViewFilters extends WatcherFilters {
  index: "instance" | "group";
  path?: string;
  status: "all" | "completed" | "failed";
}


interface ScheduleFilters extends WatcherFilters {
  index: "instance" | "group";
  key?: string;
  status: "all" | "completed" | "failed";
  groupFilter: "all" | "errors" | "slow";
}

interface RequestFilters extends WatcherFilters {
  index: "instance" | "group";
  key?: string;
  status: "all" | "2xx" | "4xx" | "5xx";
}

interface QueryFilters extends WatcherFilters {
  index: "instance" | "group";
  status: string;
  key: string;
}

interface NotificationFilters extends WatcherFilters {
  type?: string;
  channel?: string;
  status: string;
  index: "instance" | "group";
}

interface ExceptionFilters extends WatcherFilters {
  type: "all" | "unhandled" | "uncaught";
  key?: string;
  query?: string;
}

interface CacheFilters extends WatcherFilters {
  index: "instance" | "group";
  cacheType: "all" | "misses" | "hits" | "writes";
  key?: string;
}

interface HTTPClientFilters extends WatcherFilters {
  key?: string;
  index: "instance" | "group";
  status: "all" | "2xx" | "4xx" | "5xx";
}

interface ModelFilters extends WatcherFilters {
  index: "instance" | "group";
  model?: string;
  status?: "all" | "completed" | "failed";
}

interface MailFilters extends WatcherFilters {
  index: "instance" | "group";
  status: "completed" | "failed" | "all";
  key?: string;
}

interface JobFilters extends WatcherFilters {
  index: "instance" | "group";
  jobStatus: "all" | "released" | "failed" | "completed";
  queueFilter: "all" | "errors" | "slow";
  key?: string;
}

interface LogFilters extends WatcherFilters {
  logType:
    | "All"
    | "Info"
    | "Warn"
    | "Error"
    | "Debug"
    | "Trace"
    | "Fatal"
    | "Complete"
    | "Log";
  key?: string;
  index: "instance" | "group";
}



/**
 * Supported logging libraries
 * @typedef {string} Logger
 */
type Logger =
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
type Scheduler = "node-schedule" | "node-cron" | "bree";

/**
 * Supported email sending libraries
 * @typedef {string} Mailer
 */
type Mailer =
  | "nodemailer"
  | "@sendgrid/mail"
  | "mailgun.js"
  | "postmark"
  | "@aws-sdk/client-ses";

/**
 * Supported caching libraries
 * @typedef {string} Cache
 */
type Cache =
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
type Notifications =
  | "pusher"
  | "ably";

/**
 * Supported HTTP client libraries
 * @typedef {string} Http
 */
type Http =
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
type Jobs = "bull" | "agenda";

/**
 * Types of error handling to observe
 * @typedef {string} Errors
 */
type Errors = "uncaught" | "unhandled";

/**
 * Supported database query libraries
 * @typedef {string} Queries
 */
type Queries =
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
type Model = "typeorm" | "sequelize" | "prisma" | "knex" | "sqlite3";

/**
 * Supported view libraries
 * @typedef {string} Views
 */
type Views = "ejs" | "pug" | "handlebars";

/**
 * Supported database drivers for storing logs and metrics
 * @typedef {string} StoreDriver
 */
type StoreDriver = "mysql2";

/**
 * Interface representing standardized HTTP request data across different libraries
 * Common fields are required, library-specific fields are optional
 */
interface HttpRequestData {
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

interface ExceptionContent {
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

interface ViewContent {
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

interface ScheduleContent {
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

interface JobContent {
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

interface LogContent {
  package: "bunyan" | "log4js" | "signale" | "loglevel";
  type: "log";
  level: "info" | "warn" | "error" | "debug" | "verbose" | "silly" | "log";
  message: string;
  file: string;
  line: string;
  duration?: number;
}

interface NotificationContent {
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

interface MailContent {
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

interface CacheContent {
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
interface QueryContent {
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
interface ModelContent {
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
interface RequestContent {
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

interface HttpClientContent {
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

interface ClientResponse {
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

interface BaseGroupResponse {
  count: number;
  shortest?: number;
  longest?: number;
  average?: number;
  p95?: number;
}

interface CacheGroupResponse extends BaseGroupResponse {
  misses: number;
  hits: number;
  writes: number;
  cache_key: string;
}

interface ExceptionGroupResponse extends BaseGroupResponse {
  header: string;
  total: number;
}

interface CacheInstanceResponse extends ClientResponse {
  content: CacheContent;
}

interface RequestInstanceResponse extends ClientResponse {
  content: RequestContent;
}

interface JobInstanceResponse extends ClientResponse {
  content: JobContent;
}

interface ScheduleInstanceResponse extends ClientResponse {
  content: ScheduleContent;
}

interface ViewInstanceResponse extends ClientResponse {
  content: ViewContent;
}

interface ExceptionInstanceResponse extends ClientResponse {
  content: ExceptionContent;
}

interface HttpClientInstanceResponse extends ClientResponse {
  content: HttpClientContent;
}

interface MailInstanceResponse extends ClientResponse {
  content: MailContent;
}

interface LogInstanceResponse extends ClientResponse {
  content: LogContent;
}

interface NotificationInstanceResponse extends ClientResponse {
  content: NotificationContent;
}

interface QueryInstanceResponse extends ClientResponse {
  content: QueryContent;
  average: number;
  p95: number;
}

interface ModelInstanceResponse extends ClientResponse {
  content: ModelContent;
}

interface HttpClientGroupResponse extends BaseGroupResponse {
  route: string;
  average: number;
  p95: number;
  count_200: number;
  count_400: number;
  count_500: number;
}

interface JobGroupResponse extends BaseGroupResponse {
  queue: string;
  completed: number;
  released: number;
  failed: number;
}

interface RequestGroupResponse extends BaseGroupResponse {
  route: string;
  count_200: number;
  count_400: number;
  count_500: number;
  average: number;
  p95: number;
}

interface LogGroupResponse extends BaseGroupResponse {
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
interface MailGroupResponse extends BaseGroupResponse {
  mail_to: string;
  success_count: number;
  failed_count: number;
}

interface ModelGroupResponse extends BaseGroupResponse {
  modelName: string;
}

interface NotificationGroupResponse extends BaseGroupResponse {
  channel: string;
  completed: number;
  failed: number;
}

interface QueryGroupResponse extends BaseGroupResponse {
  endpoint: string;
  completed: number;
  failed: number;
  p95: number;
  average: number;
}

interface ViewGroupResponse extends BaseGroupResponse {
  size: string;
  view: string;
  completed: number;
  failed: number;
}

interface ScheduleGroupResponse extends BaseGroupResponse {
  scheduleId: string;
  cronExpression: string;
  completed: number;
  failed: number;
}

type HTTPMethod = 'get' | 'post' | 'put' | 'patch';
type HTTPStatus = number;

interface AppControllerRoute {
  method: HTTPMethod | HTTPMethod[];
  route: string | string[];

  handler(request?: ObservatoryBoardRequest): Promisify<ControllerHandlerReturnType>;
}

type ViewHandlerReturnType = {
  name: string;
  params: Record<string, string>;
};

interface AppViewRoute {
  method: HTTPMethod;
  route: string | string[];

  handler(params: { basePath: string }): ViewHandlerReturnType;
}

type Promisify<T> = T | Promise<T>

type ControllerHandlerReturnType = {
  status?: HTTPStatus;
  body: string | Record<string, any>;
};

interface ObservatoryBoardRequest {
  requestData: any;
  query: Record<string, any>;
  params: Record<string, any>;
  body: Record<string, any>;
}

interface SidePanelState {
  requestId?: string;
  jobId?: string;
  scheduleId?: string;
  modelId?: string;
  isOpen: boolean;
}

interface IServerAdapter {
  setStaticPath(staticsRoute: string, staticsPath: string): IServerAdapter;
  setEntryRoute(route: AppViewRoute): IServerAdapter;
  setErrorHandler(handler: (error: Error & { statusCode : HTTPStatus }) => ControllerHandlerReturnType): IServerAdapter;
  setApiRoutes(routes: AppControllerRoute[]): IServerAdapter;
}
