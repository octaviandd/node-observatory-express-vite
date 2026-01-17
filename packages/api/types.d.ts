declare global {
  namespace Express {
    interface Request {
      session?: { id: string; [key: string]: any };
    }
  }
  const WINSTON_PATCHED_SYMBOL: unique symbol
}

// ============================================================================
// Common Types
// ============================================================================
type Period = "1h" | "24h" | "7d" | "14d" | "30d";
type IndexType = "instance" | "group";
type StatusType = "all" | "completed" | "failed";
type HttpStatusType = "all" | "2xx" | "4xx" | "5xx";
type LogLevel = "info" | "warn" | "error" | "debug" | "verbose" | "silly" | "log" | "trace" | "fatal";

interface WatcherEntry {
  uuid: string;
  requestId?: string;
  jobId?: string;
  scheduleId?: string;
  type: string;
  content: string;
  created_at: number | Date;
}

// ============================================================================
// Filter Interfaces
// ============================================================================
interface WatcherFilters {
  period?: Period;
  offset: number;
  limit: number;
  isTable: boolean;
  query?: string;
  index: string;
}

interface IndexedFilters extends WatcherFilters {
  index: IndexType;
  key?: string;
}

interface ViewFilters extends IndexedFilters { path?: string; status: StatusType }
interface ScheduleFilters extends IndexedFilters { status: StatusType; groupFilter: "all" | "errors" | "slow" }
interface RequestFilters extends IndexedFilters { status: HttpStatusType }
interface QueryFilters extends IndexedFilters { status: string }
interface NotificationFilters extends IndexedFilters { type?: string; channel?: string; status: string }
interface CacheFilters extends IndexedFilters { cacheType: "all" | "misses" | "hits" | "writes" }
interface HTTPClientFilters extends IndexedFilters { status: HttpStatusType }
interface ModelFilters extends IndexedFilters { model?: string; status?: StatusType }
interface MailFilters extends IndexedFilters { status: StatusType }
interface JobFilters extends IndexedFilters { jobStatus: "all" | "released" | "failed" | "completed"; queueFilter: "all" | "errors" | "slow" }
interface LogFilters extends IndexedFilters { logType: "All" | "Info" | "Warn" | "Error" | "Debug" | "Trace" | "Fatal" | "Complete" | "Log" }
interface ExceptionFilters extends WatcherFilters { type: "all" | "unhandled" | "uncaught"; key?: string }



// ============================================================================
// Library Types
// ============================================================================
type Logger = "winston" | "pino" | "bunyan" | "log4js" | "signale" | "loglevel";
type Scheduler = "node-schedule" | "node-cron" | "bree";
type Mailer = "nodemailer" | "@sendgrid/mail" | "mailgun.js" | "postmark" | "@aws-sdk/client-ses";
type CachePackages = "redis" | "ioredis" | "node-cache" | "lru-cache" | "memjs" | "level" | "keyv";
type Notifications = "pusher" | "ably";
type Http = "axios" | "http" | "https" | "fetch" | "got" | "superagent" | "undici" | "ky" | "needle" | "phin" | "node-fetch";
type Jobs = "bull" | "agenda";
type Errors = "uncaught" | "unhandled";
type Queries = "knex" | "sequelize" | "sqlite3" | "typeorm" | "prisma" | "mysql2" | "mysql" | "mongodb" | "pg";
type Model = "typeorm" | "sequelize" | "prisma" | "knex" | "sqlite3";
type Views = "ejs" | "pug" | "handlebars";
type StoreDriver = "mysql2";

// ============================================================================
// Base Log Entry Types (for insertRedisStream)
// ============================================================================
interface LogLocation { file: string; line: string }
interface LogError { name: string; message: string; stack?: string; code?: string }

interface BaseLogEntry<TMetadata = Record<string, any>, TData = Record<string, any>> {
  status: "completed" | "failed";
  duration: number;
  metadata: TMetadata & { package: string };
  data: TData;
  location?: LogLocation;
  error?: LogError;
  created_at?: string;
}

// ============================================================================
// Base Content Types
// ============================================================================
interface ContentError { message: string; name: string }
interface BaseContent { file: string; line: string; duration?: number; error?: ContentError | null }

interface HttpRequestData extends BaseContent {
  method: string; origin: string; pathname: string; protocol: string;
  statusCode: number; statusMessage: string; aborted: boolean;
  headers: Record<string, string | string[] | undefined>;
  responseBody: string | Buffer; responseBodySize: number; isMedia: boolean; library: string;
  host?: string; hostname?: string; path?: string; port?: string | number | null;
  // Library-specific (Axios, Got, Node-fetch, Superagent, Needle)
  maxRedirects?: number; maxBodyLength?: number | null; beforeRedirects?: Record<string, any>;
  hooks?: Record<string, any[]>; retry?: Record<string, any>; pagination?: Record<string, any>;
  throwHttpErrors?: boolean; followRedirect?: boolean; methodRewriting?: boolean;
  resolveBodyOnly?: boolean; ignoreInvalidCookies?: boolean;
  href?: string; slashes?: boolean; auth?: string | null; hash?: string | null;
  search?: string | null; query?: string | null;
  agent?: boolean | any; rejectUnauthorized?: boolean; signal?: any;
  url?: string | Record<string, any>;
  [key: string]: any;
}

// ============================================================================
// Content Interfaces
// ============================================================================
interface ExceptionContent {
  type: "exception"; message: string; stack: string; file: string; line: string; title: string; fullError: string;
  codeContext: { lineNumber: number; content: string; isErrorLine: boolean }[];
}

interface ViewContent extends BaseContent {
  type: "view"; view: string; data: string; size: number; status: StatusType; package: Views; options: Record<string, any>;
  cacheInfo: { cacheEnabled: boolean };
}

interface ScheduleContent extends BaseContent {
  type: "schedule"; package: Scheduler; scheduleId: string; cronExpression: string; status: StatusType; jobId: string;
  nextInvocation?: string; newRule?: string; rule?: string; method?: string; name?: string; data?: Record<string, any>;
}

interface JobContent extends BaseContent {
  type: "job"; package: Jobs; queue: string; connectionName: string;
  method: "process" | "add" | "retryJob" | "start" | "pause" | "resume" | "processJob";
  status: "started" | "processing" | "completed" | "failed" | "released";
  jobData?: Record<string, any>; attemptsMade?: number; failedReason?: string; returnValue?: any; jobId?: string; token?: string;
}

interface LogContent extends BaseContent {
  type: "log"; package: "bunyan" | "log4js" | "signale" | "loglevel"; message: string;
  level: "info" | "warn" | "error" | "debug" | "verbose" | "silly" | "log";
}

interface NotificationContent extends BaseContent {
  type: "notification"; method: "trigger" | "triggerBatch"; status: StatusType; package: Notifications;
  channel?: string; event?: string; data?: Record<string, any>; options?: Record<string, any>; response?: Record<string, any>;
}

interface MailContent extends BaseContent {
  type: "mail"; status: StatusType; package: Mailer;
  info?: { messageId: string; response: string } | null; command?: string;
  to?: string[]; cc?: string[]; bcc?: string[]; from?: string; subject?: string; text?: string; body?: string;
}

interface CacheContent extends BaseContent {
  type: "cache"; package: CachePackages; hits: number; misses: number; writes: number;
  result?: any; key?: string; value?: any; checkPeriod?: number; stdTTL?: number;
}

interface QueryContent extends BaseContent {
  type: "query"; context: string; sql: string; hostname: string; port: string; database: string; status: StatusType; sqlType: string;
  package: "mysql2" | "pg" | "sequelize" | "knex" | "prisma" | "sqlite3" | "typeorm"; params?: any;
}

type ModelMethod = "create" | "find" | "findById" | "findByPk" | "findAll" | "update" | "destroy" | "count" | "sum" | "min" | "max" | "avg" | "median" | "mode" | "group" | "groupBy" | "groupByCount" | "groupBySum" | "groupByMin" | "groupByMax" | "groupByAvg" | "groupByMedian" | "groupByMode";

interface ModelContent extends BaseContent {
  type: "model"; method: ModelMethod; status: StatusType; package: Model; modelName: string; arguments: any[]; result: any;
}

interface RequestContent extends BaseContent {
  type: "request"; method: string; route: string; statusCode: number; package: "express";
  headers: Record<string, string>; query: Record<string, string>; params: Record<string, string>;
  ip: string; payload: any; responseSize: number; requestSize: number; session: Record<string, any>;
  memoryUsage: { rss: number; heapTotal: number; heapUsed: number; external: number };
}

interface HttpClientContent extends BaseContent {
  type: "http"; method: string; route: string; statusCode: number; package: string;
  headers: Record<string, string>; query: Record<string, string>; params: Record<string, string>;
  responseBody: string; responseBodySize: number; requestBody: string; requestBodySize: number; responseHeaders: Record<string, string>;
  href?: string; slashes?: boolean; auth?: string | null; hash?: string | null; search?: string | null;
  origin?: string; pathname?: string; path?: string; protocol?: string; statusMessage?: string; aborted?: boolean; fullUrl?: string;
}

// ============================================================================
// Response Types
// ============================================================================
type ContentType = "view" | "exception" | "request" | "model" | "cache" | "job" | "query" | "log" | "notification" | "mail" | "schedule" | "http";
type AllContent = ViewContent | ExceptionContent | RequestContent | ModelContent | CacheContent | JobContent | QueryContent | LogContent | NotificationContent | MailContent | ScheduleContent | HttpClientContent;

interface ClientResponse {
  uuid: string; request_id?: string; job_id?: string; schedule_id?: string;
  created_at: string; updated_at: string; type: ContentType; content: AllContent;
}

interface BaseGroupResponse { count: number; shortest?: number; longest?: number; average?: number; p95?: number }

// Instance Responses
interface CacheInstanceResponse extends ClientResponse { content: CacheContent }
interface RequestInstanceResponse extends ClientResponse { content: RequestContent }
interface JobInstanceResponse extends ClientResponse { content: JobContent }
interface ScheduleInstanceResponse extends ClientResponse { content: ScheduleContent }
interface ViewInstanceResponse extends ClientResponse { content: ViewContent }
interface ExceptionInstanceResponse extends ClientResponse { content: ExceptionContent }
interface HttpClientInstanceResponse extends ClientResponse { content: HttpClientContent }
interface MailInstanceResponse extends ClientResponse { content: MailContent }
interface LogInstanceResponse extends ClientResponse { content: LogContent }
interface NotificationInstanceResponse extends ClientResponse { content: NotificationContent }
interface QueryInstanceResponse extends ClientResponse { content: QueryContent; average: number; p95: number }
interface ModelInstanceResponse extends ClientResponse { content: ModelContent }

// Group Responses
interface CacheGroupResponse extends BaseGroupResponse { cache_key: string; misses: number; hits: number; writes: number }
interface ExceptionGroupResponse extends BaseGroupResponse { header: string; total: number }
interface HttpClientGroupResponse extends BaseGroupResponse { route: string; average: number; p95: number; count_200: number; count_400: number; count_500: number }
interface JobGroupResponse extends BaseGroupResponse { queue: string; completed: number; released: number; failed: number }
interface RequestGroupResponse extends BaseGroupResponse { route: string; average: number; p95: number; count_200: number; count_400: number; count_500: number }
interface LogGroupResponse extends BaseGroupResponse { level: string; message: string; info: number; warn: number; error: number; debug: number; trace: number; fatal: number; log: number }
interface MailGroupResponse extends BaseGroupResponse { mail_to: string; success_count: number; failed_count: number }
interface ModelGroupResponse extends BaseGroupResponse { modelName: string }
interface NotificationGroupResponse extends BaseGroupResponse { channel: string; completed: number; failed: number }
interface QueryGroupResponse extends BaseGroupResponse { endpoint: string; completed: number; failed: number; p95: number; average: number }
interface ViewGroupResponse extends BaseGroupResponse { size: string; view: string; completed: number; failed: number }
interface ScheduleGroupResponse extends BaseGroupResponse { scheduleId: string; cronExpression: string; completed: number; failed: number }

// ============================================================================
// App/Router Types
// ============================================================================
type HTTPMethod = 'get' | 'post' | 'put' | 'patch';
type HTTPStatus = number;
type Promisify<T> = T | Promise<T>;

interface ControllerHandlerReturnType { status?: HTTPStatus; body: string | Record<string, any> }
interface ViewHandlerReturnType { name: string; params: Record<string, string> }
interface ObservatoryBoardRequest { requestData: any; query: Record<string, any>; params: Record<string, any>; body: Record<string, any> }

interface AppControllerRoute {
  method: HTTPMethod | HTTPMethod[];
  route: string | string[];
  handler(request?: ObservatoryBoardRequest): Promisify<ControllerHandlerReturnType>;
}

interface AppViewRoute {
  method: HTTPMethod;
  route: string | string[];
  handler(params: { basePath: string }): ViewHandlerReturnType;
}

interface SidePanelState { requestId?: string; jobId?: string; scheduleId?: string; modelId?: string; isOpen: boolean }

interface IServerAdapter {
  setStaticPath(staticsRoute: string, staticsPath: string): IServerAdapter;
  setEntryRoute(route: AppViewRoute): IServerAdapter;
  setErrorHandler(handler: (error: Error & { statusCode: HTTPStatus }) => ControllerHandlerReturnType): IServerAdapter;
  setApiRoutes(routes: AppControllerRoute[]): IServerAdapter;
}

interface RedisEntry {
  uuid: string; type: string; content: Record<string, any>;
  created_at: string; schedule_id: string; job_id: string; request_id: string;
}