/** @format */

// ============================================================================
// Common Types
// ============================================================================
declare type WatcherType =
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

declare type Period = "1h" | "24h" | "7d" | "14d" | "30d";
declare type CustomPeriod = {
  startDate: string;
  endDate: string;
  label: "custom";
};

declare type StatusType = "all" | "completed" | "failed";
declare type NotificationStatusType = "all" | "completed" | "failed";
declare type QueryStatusType = "all" | "completed" | "failed";
declare type RequestStatusType = "all" | "2xx" | "4xx" | "5xx";
declare type HttpStatusType = "all" | "2xx" | "4xx" | "5xx";
declare type CacheStatusType = "all" | "misses" | "hits" | "writes";
declare type JobStatusType = "all" | "released" | "failed" | "completed";
declare type ExceptionStatusType = "all" | "unhandled" | "uncaught";
declare type LogStatusType =
  | "info"
  | "warn"
  | "error"
  | "debug"
  | "verbose"
  | "silly"
  | "log"
  | "trace"
  | "fatal";

declare interface WatcherEntry {
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
declare interface WatcherFilters {
  offset: number;
  limit: number;
  period: Period;
  isTable: boolean;
  index: "instance" | "group";
  query?: string;
  key?: string;
}

declare interface Filters<T> extends WatcherFilters {
  status: T;
}

declare type ViewFilters = Filters<StatusType>;
declare type ScheduleFilters = Filters<StatusType>;
declare type RequestFilters = Filters<HttpStatusType>;
declare type QueryFilters = Filters<QueryStatusType>;
declare type NotificationFilters = Filters<NotificationStatusType>;
declare type CacheFilters = Filters<CacheStatusType>;
declare type HTTPClientFilters = Filters<HttpStatusType>;
declare type ModelFilters = Filters<StatusType>;
declare type MailFilters = Filters<StatusType>;
declare type JobFilters = Filters<JobStatusType>;
declare type LogFilters = Filters<LogStatusType>;
declare type ExceptionFilters = Filters<ExceptionStatusType>;

declare type FiltersByWatcherType = {
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
declare type Logger =
  | "winston"
  | "pino"
  | "bunyan"
  | "log4js"
  | "signale"
  | "loglevel";
declare type Scheduler = "node-schedule" | "node-cron" | "bree";
declare type Mailer =
  | "nodemailer"
  | "@sendgrid/mail"
  | "mailgun.js"
  | "postmark"
  | "@aws-sdk/client-ses";
declare type CachePackages =
  | "redis"
  | "ioredis"
  | "node-cache"
  | "lru-cache"
  | "memjs"
  | "level"
  | "keyv";
declare type Notifications = "pusher" | "ably";
declare type Http =
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
declare type Jobs = "bull" | "agenda";
declare type Errors = "uncaught" | "unhandled";
declare type Queries =
  | "knex"
  | "sequelize"
  | "sqlite3"
  | "typeorm"
  | "prisma"
  | "mysql2"
  | "mysql"
  | "mongodb"
  | "pg";
declare type Model =
  | "typeorm"
  | "sequelize"
  | "prisma"
  | "knex"
  | "sqlite3"
  | "mongoose";
declare type Views = "ejs" | "pug" | "handlebars";
declare type StoreDriver = "mysql2";

// ============================================================================
// Base Log Entry Types
// ============================================================================
declare interface LogLocation {
  file: string;
  line: string;
}
declare interface LogError {
  name: string;
  message: string;
  stack?: string;
  code?: string;
}

declare interface BaseLogEntry<
  TMetadata = Record<string, unknown>,
  TData = Record<string, unknown>,
> {
  metadata: TMetadata & {
    location?: LogLocation;
    created_at: string;
    package: string;
  };
  data: TData;
  error?: LogError;
}

// ============================================================================
// Content Types
// ============================================================================
declare type RequestMetadata = { duration: number };
declare type RequestData = {
  route?: string;
  method: string;
  statusCode: number;
  originalUrl: string;
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
declare type RequestContent = BaseLogEntry<RequestMetadata, RequestData>;

declare type ViewMetadata = { method: string; duration: number };
declare type ViewData = {
  status?: "completed" | "failed";
  view: string;
  options: Record<string, any>;
  size: number;
  cacheInfo: { cacheEnabled: boolean };
};
declare type ViewContent = BaseLogEntry<ViewMetadata, ViewData>;

declare type CacheMetadata = { duration: number };
declare type CacheData = {
  method: string;
  status?: "completed" | "failed";
  host?: string;
  port?: number;
  key?: string;
  hits?: number;
  misses?: number;
  writes?: number;
};
declare type CacheContent = BaseLogEntry<CacheMetadata, CacheData>;

declare type LogMetadata = { package: Logger; level: string; logger?: string };
declare type LogData = { message: any };
declare type LogContent = BaseLogEntry<LogMetadata, LogData>;

declare type NotificationMetadata = { mode?: string; duration: number };
declare type NotificationData = {
  method: string;
  channel?: string;
  event?: string;
  payload?: any;
  batch?: any[];
  options?: any;
};
declare type NotificationContent = BaseLogEntry<
  NotificationMetadata,
  NotificationData
>;

declare type MailMetadata = { duration: number };
declare type MailData = {
  command: string;
  to: string[];
  cc: string[];
  bcc: string[];
  from: string;
  subject?: string;
  body?: string;
  templateId?: string;
  messageId?: string;
};
declare type MailContent = BaseLogEntry<MailMetadata, MailData>;

declare type QueryMetadata = { duration: number };
declare type QueryData = {
  sqlType?: string;
  method?: string;
  sql?: string;
  query?: string;
  context?: string;
  hostname?: string;
  port?: string | number;
  database?: string;
  rowCount?: number;
};
declare type QueryContent = BaseLogEntry<QueryMetadata, QueryData>;

declare type ModelMetadata = { duration: number };
declare type ModelData = {
  status: "completed" | "failed";
  method: string;
  modelName: string;
};
declare type ModelContent = BaseLogEntry<ModelMetadata, ModelData>;

declare type JobMetadata = { duration: number };
declare type JobData = {
  method: string;
  queue?: string;
  status: string;
  connectionName?: string;
  jobId?: string;
  attemptsMade?: number;
  failedReason?: string;
};
declare type JobContent = BaseLogEntry<JobMetadata, JobData>;

declare type HttpClientMetadata = { duration: number };
declare type HttpClientData = {
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
declare type HttpClientContent = BaseLogEntry<
  HttpClientMetadata,
  HttpClientData
>;

declare type ScheduleMetadata = { duration: number };
declare type ScheduleData = {
  cronExpression?: string;
  jobId?: string;
  scheduleId: string;
  breeId?: string;
  type: string;
  name?: string | null;
  rule?: any;
  jobName?: string;
};
declare type ScheduleContent = BaseLogEntry<ScheduleMetadata, ScheduleData>;

declare type ExceptionMetadata = {};
declare type ExceptionData = {
  message: string;
  stack: string;
  file: string;
  line: string;
  title: string;
  fullError: string;
  codeContext: { lineNumber: number; content: string; isErrorLine: boolean }[];
};
declare type ExceptionContent = BaseLogEntry<ExceptionMetadata, ExceptionData>;

// ============================================================================
// Response Types
// ============================================================================
declare type ContentType =
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

declare type AllContent =
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

declare interface ClientResponse {
  uuid: string;
  request_id?: string;
  job_id?: string;
  schedule_id?: string;
  created_at: string;
  updated_at: string;
  type: ContentType;
  content: AllContent;
}

declare interface BaseGroupResponse {
  count: number;
  shortest?: number;
  longest?: number;
  average?: number;
  p95?: number;
}

declare type WatcherTypeToInstanceResponse = {
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

declare type ViewDataResponse = Partial<{
  [K in WatcherType]: WatcherTypeToInstanceResponse[K][];
}>;

// Instance Responses
declare interface CacheInstanceResponse extends ClientResponse {
  content: CacheContent;
}
declare interface RequestInstanceResponse extends ClientResponse {
  content: RequestContent;
}
declare interface JobInstanceResponse extends ClientResponse {
  content: JobContent;
}
declare interface ScheduleInstanceResponse extends ClientResponse {
  content: ScheduleContent;
}
declare interface ViewInstanceResponse extends ClientResponse {
  content: ViewContent;
}
declare interface ExceptionInstanceResponse extends ClientResponse {
  content: ExceptionContent;
}
declare interface HttpClientInstanceResponse extends ClientResponse {
  content: HttpClientContent;
}
declare interface MailInstanceResponse extends ClientResponse {
  content: MailContent;
}
declare interface LogInstanceResponse extends ClientResponse {
  content: LogContent;
}
declare interface NotificationInstanceResponse extends ClientResponse {
  content: NotificationContent;
}
declare interface QueryInstanceResponse extends ClientResponse {
  content: QueryContent;
  average: number;
  p95: number;
}
declare interface ModelInstanceResponse extends ClientResponse {
  content: ModelContent;
}

// Group Responses
declare interface CacheGroupResponse extends BaseGroupResponse {
  cache_key: string;
  misses: number;
  hits: number;
  writes: number;
}
declare interface ExceptionGroupResponse extends BaseGroupResponse {
  header: string;
  total: number;
}
declare interface HttpClientGroupResponse extends BaseGroupResponse {
  route: string;
  average: number;
  p95: number;
  count_200: number;
  count_400: number;
  count_500: number;
}
declare interface JobGroupResponse extends BaseGroupResponse {
  queue: string;
  completed: number;
  released: number;
  failed: number;
}
declare interface RequestGroupResponse extends BaseGroupResponse {
  route: string;
  average: number;
  p95: number;
  count_200: number;
  count_400: number;
  count_500: number;
}
declare interface LogGroupResponse extends BaseGroupResponse {
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
declare interface MailGroupResponse extends BaseGroupResponse {
  mail_to: string;
  success_count: number;
  failed_count: number;
}
declare interface ModelGroupResponse extends BaseGroupResponse {
  modelName: string;
}
declare interface NotificationGroupResponse extends BaseGroupResponse {
  channel: string;
  completed: number;
  failed: number;
}
declare interface QueryGroupResponse extends BaseGroupResponse {
  endpoint: string;
  completed: number;
  failed: number;
  p95: number;
  average: number;
}
declare interface ViewGroupResponse extends BaseGroupResponse {
  size: string;
  view: string;
  completed: number;
  failed: number;
}
declare interface ScheduleGroupResponse extends BaseGroupResponse {
  scheduleId: string;
  cronExpression: string;
  completed: number;
  failed: number;
}

declare type ClientGroupResponses =
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
// App / Adapter Types
// ============================================================================
declare type HTTPMethod = "get" | "post" | "put" | "patch";
declare type HTTPStatus = number;
declare type Promisify<T> = T | Promise<T>;

declare interface ControllerHandlerReturnType {
  status?: HTTPStatus;
  body: string | Record<string, any>;
}
declare interface ViewHandlerReturnType {
  name: string;
  params: Record<string, string>;
}
declare interface ObservatoryBoardRequest {
  requestData: any;
  query: Record<string, any>;
  params: Record<string, any>;
  body: Record<string, any>;
}
declare interface AppControllerRoute {
  method: HTTPMethod | HTTPMethod[];
  route: string | string[];
  handler(
    request?: ObservatoryBoardRequest,
  ): Promisify<ControllerHandlerReturnType>;
}
declare interface AppViewRoute {
  method: HTTPMethod;
  route: string | string[];
  handler(params: { basePath: string }): ViewHandlerReturnType;
}
declare interface IServerAdapter {
  setStaticPath(staticsRoute: string, staticsPath: string): IServerAdapter;
  setEntryRoute(route: AppViewRoute): IServerAdapter;
  setErrorHandler(
    handler: (
      error: Error & { statusCode: HTTPStatus },
    ) => ControllerHandlerReturnType,
  ): IServerAdapter;
  setApiRoutes(routes: AppControllerRoute[]): IServerAdapter;
}

declare interface ApiResponse<T> {
  body: T;
  statusCode: HTTPStatus;
}

declare interface TableDataResponse<
  T extends WatcherType,
  I extends "instance" | "group",
> {
  results: WatcherResults<T, I>;
  count: string;
}

declare interface CountGraphDataResponse {
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

declare interface DurationGraphDataResponse {
  durationFormattedData:
    | Array<{
        durations: number[];
        avgDuration: number;
        p95: number;
        count: number;
        label: string;
      }>
    | Record<
        string,
        {
          durations: number[];
          avgDuration: number;
          p95: number;
          count: number;
          label: string;
        }
      >;
  shortest: string;
  longest: string;
  average: string;
  p95: string;
}

declare interface DashboardData {
  requests: { count: any; duration: any };
  exceptions: { count: any };
  jobs: { count: any; duration: any };
  slowRequests: any[];
  slowQueries: any[];
}
