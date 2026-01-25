/** @format */


interface WatcherConfig<TFilters = WatcherFilters> {
  type: string;
  graphMetrics: readonly string[];
  filterExtractor: (req: ObservatoryBoardRequest) => TFilters;
}

function createBaseFilterExtractor(req: ObservatoryBoardRequest): WatcherFilters {
  return {
    offset: parseInt(req.query.offset as string, 10) || 0,
    limit: parseInt(req.query.limit as string, 10) || 20,
    period: req.query.period as Period,
    query: req.query.q as string,
    isTable: req.query.table === "true",
    index: req.query.index as IndexType,
    key: req.query.key as string | undefined,
  };
}

function createFilterExtractor<TFilters extends WatcherFilters>(
  extensions: (req: ObservatoryBoardRequest) => Omit<TFilters, keyof WatcherFilters>
): (req: ObservatoryBoardRequest) => TFilters {
  return (req: ObservatoryBoardRequest) => ({
    ...createBaseFilterExtractor(req),
    ...extensions(req),
  } as TFilters);
}

export const WATCHER_CONFIGS = {
  exception: {
    type: 'exception',
    graphMetrics: ['unhandledRejection', 'uncaughtException'] as const,
    filterExtractor: createFilterExtractor<ExceptionFilters>((req) => ({
      type: req.query.status as ExceptionFilters['type'],
    }))
  } satisfies WatcherConfig<ExceptionFilters>,

  cache: {
    type: 'cache',
    graphMetrics: ['hits', 'misses', 'writes'] as const,
    filterExtractor: createFilterExtractor<CacheFilters>((req) => ({
      type: req.query.status as CacheFilters['type'],
    }))
  } satisfies WatcherConfig<CacheFilters>,

  request: {
    type: 'request',
    graphMetrics: ['count_200', 'count_400', 'count_500'] as const,
    filterExtractor: createFilterExtractor<RequestFilters>((req) => ({
      status: req.query.status as RequestFilters['status'],
    }))
  } satisfies WatcherConfig<RequestFilters>,

  query: {
    type: 'query',
    graphMetrics: ['completed', 'failed'] as const,
    filterExtractor: createFilterExtractor<QueryFilters>((req) => ({
      status: req.query.status as string,
    }))
  } satisfies WatcherConfig<QueryFilters>,

  notification: {
    type: 'notification',
    graphMetrics: ['completed', 'failed'] as const,
    filterExtractor: createFilterExtractor<NotificationFilters>((req) => ({
      status: req.query.status as NotificationFilters['status'],
    }))
  } satisfies WatcherConfig<NotificationFilters>,

  mail: {
    type: 'mail',
    graphMetrics: ['completed', 'failed'] as const,
    filterExtractor: createFilterExtractor<MailFilters>((req) => ({
      status: req.query.status as MailFilters['status'],
    }))
  } satisfies WatcherConfig<MailFilters>,

  job: {
    type: 'job',
    graphMetrics: ['hits', 'misses', 'writes'] as const,
    filterExtractor: createFilterExtractor<JobFilters>((req) => ({
      status: req.query.status as JobFilters['status'],
      queue: req.query.queue as JobFilters['queue'],
    }))
  } satisfies WatcherConfig<JobFilters>,

  schedule: {
    type: 'schedule',
    graphMetrics: ['completed', 'failed'] as const,
    filterExtractor: createFilterExtractor<ScheduleFilters>((req) => ({
      status: req.query.status as ScheduleFilters['status'],
      groupFilter: req.query.groupFilter as ScheduleFilters['groupFilter'],
    }))
  } satisfies WatcherConfig<ScheduleFilters>,

  http: {
    type: 'http',
    graphMetrics: ['count_200', 'count_400', 'count_500'] as const,
    filterExtractor: createFilterExtractor<RequestFilters>((req) => ({
      status: req.query.status as RequestFilters['status'],
    }))
  } satisfies WatcherConfig<RequestFilters>,

  log: {
    type: 'log',
    graphMetrics: ['error', 'warning', 'info'] as const,
    filterExtractor: createFilterExtractor<LogFilters>((req) => ({
      logType: req.query.type as LogFilters['logType'],
    }))
  } satisfies WatcherConfig<LogFilters>,

  view: {
    type: 'view',
    graphMetrics: ['completed', "failed"] as const,
    filterExtractor: createFilterExtractor<ViewFilters>((req) => ({
      status: req.query.status as ViewFilters['status'],
    }))
  } satisfies WatcherConfig<ViewFilters>,

  model: {
    type: 'model',
    graphMetrics: ['completed', 'failed'] as const,
    filterExtractor: createFilterExtractor<ModelFilters>((req) => ({
      status: req.query.status as ModelFilters['status'],
    }))
  } satisfies WatcherConfig<ModelFilters>,
} as const;