/** @format */

export type WatcherResultMap = {
  request: {
    instance: RequestInstanceResponse[];
    group: RequestGroupResponse[];
  };
  cache: {
    instance: CacheInstanceResponse[];
    group: CacheGroupResponse[];
  };
  job: {
    instance: JobInstanceResponse[];
    group: JobGroupResponse[];
  };
  query: {
    instance: QueryInstanceResponse[];
    group: QueryGroupResponse[];
  };
  http: {
    instance: HttpClientInstanceResponse[];
    group: HttpClientGroupResponse[];
  };
  schedule: {
    instance: ScheduleInstanceResponse[];
    group: ScheduleGroupResponse[];
  };
  mail: {
    instance: MailInstanceResponse[];
    group: MailGroupResponse[];
  };
  log: {
    instance: LogInstanceResponse[];
    group: LogGroupResponse[];
  };
  exception: {
    instance: ExceptionInstanceResponse[];
    group: ExceptionGroupResponse[];
  };
  model: {
    instance: ModelInstanceResponse[];
    group: ModelGroupResponse[];
  };
  view: {
    instance: ViewInstanceResponse[];
    group: ViewGroupResponse[];
  };
  notification: {
    instance: NotificationInstanceResponse[];
    group: NotificationGroupResponse[];
  };
};

export type WatcherType = keyof WatcherResultMap;

export interface WatcherConfig<
  T extends WatcherType = WatcherType,
  TFilters = WatcherFilters,
> {
  type: T;
  graphMetrics: readonly string[];
  filterExtractor: (req: ObservatoryBoardRequest) => TFilters;
}

const VALID_PERIODS = ["1h", "24h", "7d", "14d", "30d"] as const;
type Period = (typeof VALID_PERIODS)[number];

function validatePeriod(period: string | undefined): Period {
  if (!period) {
    return "24h"; // Default period
  }

  if (!VALID_PERIODS.includes(period as Period)) {
    throw new Error(
      `Invalid period: "${period}". Must be one of: ${VALID_PERIODS.join(", ")}`,
    );
  }

  return period as Period;
}

function createBaseFilterExtractor(
  req: ObservatoryBoardRequest,
): WatcherFilters {
  const rawPeriod = req.query.period as string | undefined;

  return {
    offset: parseInt(req.query.offset as string, 10) || 0,
    limit: parseInt(req.query.limit as string, 10) || 20,
    period: validatePeriod(rawPeriod),
    query: req.query.q as string,
    isTable: req.query.table === "true",
    index: req.query.index as IndexType,
    key: req.query.key ? decodeURIComponent(req.query.key as string) : undefined,
    status: req.query.status as string,
  };
}

function createFilterExtractor<TFilters extends WatcherFilters>(
  extensions: (
    req: ObservatoryBoardRequest,
  ) => Omit<TFilters, keyof WatcherFilters>,
): (req: ObservatoryBoardRequest) => TFilters {
  return (req: ObservatoryBoardRequest) =>
    ({
      ...createBaseFilterExtractor(req),
      ...extensions(req),
    }) as TFilters;
}

export const WATCHER_CONFIGS = {
  exception: {
    type: "exception" as const,
    graphMetrics: ["unhandledRejection", "uncaughtException"] as const,
    filterExtractor: createFilterExtractor<ExceptionFilters>((req) => ({})),
  } satisfies WatcherConfig<"exception", ExceptionFilters>,

  cache: {
    type: "cache" as const,
    graphMetrics: ["hits", "writes", "misses"] as const,
    filterExtractor: createFilterExtractor<CacheFilters>((req) => ({})),
  } satisfies WatcherConfig<"cache", CacheFilters>,

  request: {
    type: "request" as const,
    graphMetrics: ["count_200", "count_400", "count_500"] as const,
    filterExtractor: createFilterExtractor<RequestFilters>((req) => ({})),
  } satisfies WatcherConfig<"request", RequestFilters>,

  query: {
    type: "query" as const,
    graphMetrics: ["completed", "failed"] as const,
    filterExtractor: createFilterExtractor<QueryFilters>((req) => ({})),
  } satisfies WatcherConfig<"query", QueryFilters>,

  notification: {
    type: "notification" as const,
    graphMetrics: ["completed", "failed"] as const,
    filterExtractor: createFilterExtractor<NotificationFilters>((req) => ({})),
  } satisfies WatcherConfig<"notification", NotificationFilters>,

  mail: {
    type: "mail" as const,
    graphMetrics: ["completed", "failed"] as const,
    filterExtractor: createFilterExtractor<MailFilters>((req) => ({})),
  } satisfies WatcherConfig<"mail", MailFilters>,

  job: {
    type: "job" as const,
    graphMetrics: ["completed", "released", "failed"] as const,
    filterExtractor: createFilterExtractor<JobFilters>((req) => ({
      queue: req.query.queue as JobFilters["queue"],
    })),
  } satisfies WatcherConfig<"job", JobFilters>,

  schedule: {
    type: "schedule" as const,
    graphMetrics: ["completed", "failed"] as const,
    filterExtractor: createFilterExtractor<ScheduleFilters>((req) => ({
      groupFilter: req.query.groupFilter as ScheduleFilters["groupFilter"],
    })),
  } satisfies WatcherConfig<"schedule", ScheduleFilters>,

  http: {
    type: "http" as const,
    graphMetrics: ["count_200", "count_400", "count_500"] as const,
    filterExtractor: createFilterExtractor<RequestFilters>((req) => ({})),
  } satisfies WatcherConfig<"http", RequestFilters>,

  log: {
    type: "log" as const,
    graphMetrics: ["info", "warn", "error", "log", "debug", "trace", "fatal"] as const,
    filterExtractor: createFilterExtractor<LogFilters>((req) => ({
      logType: req.query.type as LogFilters["logType"],
    })),
  } satisfies WatcherConfig<"log", LogFilters>,

  view: {
    type: "view" as const,
    graphMetrics: ["completed", "failed"] as const,
    filterExtractor: createFilterExtractor<ViewFilters>((req) => ({})),
  } satisfies WatcherConfig<"view", ViewFilters>,

  model: {
    type: "model" as const,
    graphMetrics: ["completed", "failed"] as const,
    filterExtractor: createFilterExtractor<ModelFilters>((req) => ({})),
  } satisfies WatcherConfig<"model", ModelFilters>,
} as const;

export type WatcherConfigByType<T extends WatcherType> =
  (typeof WATCHER_CONFIGS)[T];

export type WatcherResults<
  T extends WatcherType,
  I extends "instance" | "group",
> = WatcherResultMap[T][I];