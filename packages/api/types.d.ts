/** @format */

declare global {
  namespace Express {
    interface Request {
      session?: { id: string; [key: string]: any };
    }
  }
  // const WINSTON_PATCHED_SYMBOL: unique symbol;
}

// ============================================================================
// Common Types
// ============================================================================
type Period = "1h" | "24h" | "7d" | "14d" | "30d";
type CustomPeriod = {
  startDate: string; // ISO string
  endDate: string;   // ISO string
  label: "custom";
};

type PeriodValue = Period | CustomPeriod;
type IndexType = "instance" | "group";
type StatusType = "all" | "completed" | "failed";
type HttpStatusType = "all" | "2xx" | "4xx" | "5xx";
type LogLevel =
  | "info"
  | "warn"
  | "error"
  | "debug"
  | "verbose"
  | "silly"
  | "log"
  | "trace"
  | "fatal";
type WatcherType =
  | "request"
  | "cache"
  | "log"
  | "mail"
  | "http"
  | "notification"
  | "view"
  | "schedule"
  | "model"
  | "exception"
  | "job"
  | "query";

interface WatcherEntry {
  uuid: string;
  request_id?: string;
  job_id?: string;
  schedule_id?: string;
  type: string;
  content: string | Record<string, any>;
  created_at: string | Date;
}

// ============================================================================
// Filter Interfaces
// ============================================================================
interface WatcherFilters {
  offset: number;
  limit: number;
  period: PeriodValue;
  query: string;
  isTable: boolean;
  index: IndexType;
  key?: string;
  status?: string;
}

interface IndexedFilters extends WatcherFilters {
  index: IndexType;
  key?: string;
}

interface ViewFilters extends IndexedFilters {
  path?: string;
  status: StatusType;
}
interface ScheduleFilters extends IndexedFilters {
  status: StatusType;
  groupFilter: "all" | "errors" | "slow";
}
interface RequestFilters extends IndexedFilters {
  status: HttpStatusType;
}
interface QueryFilters extends IndexedFilters {
  status: string;
}
interface NotificationFilters extends IndexedFilters {
  type?: string;
  channel?: string;
  status: string;
}
interface CacheFilters extends IndexedFilters {
  type: "all" | "misses" | "hits" | "writes";
}
interface HTTPClientFilters extends IndexedFilters {
  status: HttpStatusType;
}
interface ModelFilters extends IndexedFilters {
  model?: string;
  status?: StatusType;
}
interface MailFilters extends IndexedFilters {
  status: StatusType;
}
interface JobFilters extends IndexedFilters {
  status: "all" | "released" | "failed" | "completed";
  queue: "all" | "errors" | "slow";
}
interface LogFilters extends IndexedFilters {
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
}
interface ExceptionFilters extends IndexedFilters {
  type: "all" | "unhandled" | "uncaught";
}

type FiltersByWatcherType = {
  request: RequestFilters;
  query: QueryFilters;
  cache: CacheFilters;
  job: JobFilters;
  log: LogFilters;
  mail: MailFilters;
  exception: ExceptionFilters;
  http: RequestFilters;  
  schedule: ScheduleFilters;
  notification: NotificationFilters;
  model: ModelFilters;
  view: ViewFilters;
};

// ============================================================================
// Library Types
// ============================================================================
type Logger = "winston" | "pino" | "bunyan" | "log4js" | "signale" | "loglevel";
type Scheduler = "node-schedule" | "node-cron" | "bree";
type Mailer =
  | "nodemailer"
  | "@sendgrid/mail"
  | "mailgun.js"
  | "postmark"
  | "@aws-sdk/client-ses";
type CachePackages =
  | "redis"
  | "ioredis"
  | "node-cache"
  | "lru-cache"
  | "memjs"
  | "level"
  | "keyv";
type Notifications = "pusher" | "ably";
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
type Jobs = "bull" | "agenda";
type Errors = "uncaught" | "unhandled";
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
type Model = "typeorm" | "sequelize" | "prisma" | "knex" | "sqlite3" | "mongoose";
type Views = "ejs" | "pug" | "handlebars";
type StoreDriver = "mysql2";

// ============================================================================
// Base Log Entry Types (for insertRedisStream)
// ============================================================================
interface LogLocation {
  file: string;
  line: string;
}
interface LogError {
  name: string;
  message: string;
  stack?: string;
  code?: string;
}

interface BaseLogEntry<
  TMetadata = Record<string, any>,
  TData = Record<string, any>,
> {
  status?: "completed" | "failed" | "released";
  duration?: number;
  metadata: TMetadata & { package: string };
  data: TData;
  location?: LogLocation;
  error?: LogError;
  created_at?: string;
}

// ============================================================================
// Content Types (matching patcher log entry shapes)
// ============================================================================

// -- Request (express-common, http-common server) --
type RequestMetadata = { package: "express" | "http"; method: string; type?: string };
type RequestData = {
  route?: string;
  statusCode: number;
  requestSize?: number;
  responseSize?: number;
  payload?: string;
  headers?: Record<string, any>;
  query?: Record<string, any>;
  params?: Record<string, any>;
  ip?: string;
  ipAddress?: string;
  memoryUsage?: NodeJS.MemoryUsage;
  session?: Record<string, any>;
};
type RequestContent = BaseLogEntry<RequestMetadata, RequestData>;

// -- View (express-common render) --
type ViewMetadata = { package: string; method: "render" };
type ViewData = {
  view: string;
  options: Record<string, any>;
  size: number;
  cacheInfo: { cacheEnabled: boolean };
};
type ViewContent = BaseLogEntry<ViewMetadata, ViewData>;

// -- Exception (not from a patcher – caught by the framework) --
interface ExceptionContent {
  type: "exception";
  message: string;
  stack: string;
  file: string;
  line: string;
  title: string;
  fullError: string;
  codeContext: { lineNumber: number; content: string; isErrorLine: boolean }[];
}

// -- Cache (redis, ioredis, node-cache, lru-cache, memjs, level, keyv) --
type CacheMetadata = { package: CachePackages; command: string; host?: string; port?: number };
type CacheData = { key?: string; hits?: number; misses?: number; writes?: number };
type CacheContent = BaseLogEntry<CacheMetadata, CacheData>;

// -- Log (winston, pino, bunyan, log4js, signale, loglevel) --
type LogMetadata = { package: Logger; level: string; logger?: string };
type LogData = { message: any };
type LogContent = BaseLogEntry<LogMetadata, LogData>;

// -- Notification (pusher, ably) --
type NotificationMetadata =
  | { package: "pusher"; method: "trigger" | "triggerBatch" }
  | { package: "ably"; method: string; mode: "realtime" | "rest" };
type NotificationData = {
  channel?: string;
  event?: string;
  payload?: any;
  batch?: any[];
  options?: any;
};
type NotificationContent = BaseLogEntry<NotificationMetadata, NotificationData>;

// -- Mail (nodemailer, sendgrid, mailgun, postmark, aws-ses) --
type MailMetadata = { package: Mailer; command: string };
type MailData = {
  to: string[];
  cc: string[];
  bcc: string[];
  from: string;
  subject?: string;
  body?: string;
  templateId?: string;
  messageId?: string;
};
type MailContent = BaseLogEntry<MailMetadata, MailData>;

// -- Query (pg, mysql2, mysql, knex, sqlite3) --
type QueryMetadata = { package: Queries; context?: string; sqlType?: string; method?: string };
type QueryData = {
  sql?: string;
  query?: string;
  hostname?: string;
  port?: string | number;
  database?: string;
  rowCount?: number;
};
type QueryContent = BaseLogEntry<QueryMetadata, QueryData>;

// -- Model (prisma, sequelize, typeorm, mongoose) --
type ModelMetadata = { package: Model; method: string; modelName: string };
type ModelData = Record<string, any>;
type ModelContent = BaseLogEntry<ModelMetadata, ModelData>;

// -- Job (bull, agenda) --
type JobMetadata = { package: Jobs; method: string; queue?: string; connectionName?: string };
type JobData = {
  queue?: string;
  connectionName?: string;
  jobId?: string;
  attemptsMade?: number;
  failedReason?: string;
};
type JobContent = BaseLogEntry<JobMetadata, JobData>;

// -- HTTP Client (axios, fetch, http/https, undici) --
type HttpClientMetadata = { package: string; method?: string };
type HttpClientData = {
  method?: string;
  hostname?: string;
  pathname?: string;
  statusCode?: number;
  origin?: string;
  port?: number | string;
  path?: string;
  headers?: Record<string, any>;
  requestBody?: string;
  requestBodySize?: number;
  responseBody?: string;
  responseBodySize?: number;
  statusMessage?: string;
  isRedirect?: boolean;
  redirectFrom?: string;
  isMedia?: boolean;
  aborted?: boolean;
};
type HttpClientContent = BaseLogEntry<HttpClientMetadata, HttpClientData>;

// -- Schedule (node-schedule, node-cron, bree) --
type ScheduleMetadata = {
  package: Scheduler;
  type: string;
  scheduleId: string;
  breeId?: string;
  jobId?: string;
};
type ScheduleData = {
  cronExpression?: string;
  name?: string | null;
  rule?: any;
  jobName?: string;
};
type ScheduleContent = BaseLogEntry<ScheduleMetadata, ScheduleData>;

// ============================================================================
// Response Types
// ============================================================================
type ContentType =
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
type AllContent =
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

interface ClientResponse {
  uuid: string;
  request_id?: string;
  job_id?: string;
  schedule_id?: string;
  created_at: string;
  updated_at: string;
  type: ContentType;
  content: AllContent;
}

interface BaseGroupResponse {
  count: number;
  shortest?: number;
  longest?: number;
  average?: number;
  p95?: number;
}

type WatcherTypeToInstanceResponse = {
  request: RequestInstanceResponse;
  cache: CacheInstanceResponse;
  log: LogInstanceResponse;
  mail: MailInstanceResponse;
  http: HttpClientInstanceResponse;
  notification: NotificationInstanceResponse;
  view: ViewInstanceResponse;
  schedule: ScheduleInstanceResponse;
  model: ModelInstanceResponse;
  exception: ExceptionInstanceResponse;
  job: JobInstanceResponse;
  query: QueryInstanceResponse;
};

type ViewDataResponse = Partial<{
  [K in WatcherType]: WatcherTypeToInstanceResponse[K][];
}>;

// Instance Responses
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

// Group Responses
interface CacheGroupResponse extends BaseGroupResponse {
  cache_key: string;
  misses: number;
  hits: number;
  writes: number;
}
interface ExceptionGroupResponse extends BaseGroupResponse {
  header: string;
  total: number;
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
  average: number;
  p95: number;
  count_200: number;
  count_400: number;
  count_500: number;
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

type ClientGroupResponses =
  | CacheGroupResponse
  | ExceptionGroupResponse
  | HttpClientGroupResponse
  | JobGroupResponse
  | RequestGroupResponse
  | LogGroupResponse
  | MailGroupResponse
  | ModelGroupResponse
  | NotificationGroupResponse
  | QueryGroupResponse
  | ViewGroupResponse
  | ScheduleGroupResponse;

// ============================================================================
// App/Router Types
// ============================================================================
type HTTPMethod = "get" | "post" | "put" | "patch";
type HTTPStatus = number;
type Promisify<T> = T | Promise<T>;

interface ControllerHandlerReturnType {
  status?: HTTPStatus;
  body: string | Record<string, any>;
}
interface ViewHandlerReturnType {
  name: string;
  params: Record<string, string>;
}
interface ObservatoryBoardRequest {
  requestData: any;
  query: Record<string, any>;
  params: Record<string, any>;
  body: Record<string, any>;
}

interface AppControllerRoute {
  method: HTTPMethod | HTTPMethod[];
  route: string | string[];
  handler(
    request?: ObservatoryBoardRequest,
  ): Promisify<ControllerHandlerReturnType>;
}

interface AppViewRoute {
  method: HTTPMethod;
  route: string | string[];
  handler(params: { basePath: string }): ViewHandlerReturnType;
}

interface IServerAdapter {
  setStaticPath(staticsRoute: string, staticsPath: string): IServerAdapter;
  setEntryRoute(route: AppViewRoute): IServerAdapter;
  setErrorHandler(
    handler: (
      error: Error & { statusCode: HTTPStatus },
    ) => ControllerHandlerReturnType,
  ): IServerAdapter;
  setApiRoutes(routes: AppControllerRoute[]): IServerAdapter;
}

interface ApiResponse<T> {
  body: T;
  statusCode: HTTPStatus;
}

interface TableDataResponse<
  T extends WatcherType,
  I extends "instance" | "group",
> {
  results: WatcherResults<T, I>;
  count: string;
}

interface CountGraphDataResponse {
  countFormattedData: Record<string, string | number>[];
  count: string;
  indexCountOne: string;
  indexCountTwo: string;
  indexCountThree: string;
  indexCountFour?: string;
  indexCountFive?: string;
  indexCountSix?: string;
  indexCountSeven?: string;
  indexCountEight?: string;
}

interface DurationGraphDataResponse {
  durationFormattedData: Array<{
    durations: number[];
    avgDuration: number;
    p95: number;
    count: number;
    label: string;
  }> | Record<string, {
    durations: number[];
    avgDuration: number;
    p95: number;
    count: number;
    label: string;
  }>;
  shortest: string;
  longest: string;
  average: string;
  p95: string;
}

interface DashboardData {
  requests: {
    count: any;
    duration: any;
  };
  exceptions: {
    count: any;
  };
  jobs: {
    count: any;
    duration: any;
  };
  slowRequests: any[];
  slowQueries: any[];
}