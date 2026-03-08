/** @format */

import { RedisClientType } from "redis";
import { BaseWatcher } from "./BaseWatcher";
import Database from "../databases/sql/Base.js";
import { formatValue, groupItemsByType } from "../helpers/helpers";
import {
  WatcherConfig,
  WatcherType,
  WatcherResults,
} from "../watcherConfig.js";

/**
 * GenericWatcher
 *
 * A thin, type-safe wrapper around BaseWatcher that delegates all persistence
 * and aggregation work to the SQL Database adapter (DBInstance), while applying
 * watcher-specific configuration (filters, grouping, graph metrics).
 *
 * T:
 *   The watcher type (request/log/job/etc) used to select DB queries + type mappings.
 * TFilters:
 *   Additional watcher-specific filters (e.g. queue for jobs, model name for models).
 */
class GenericWatcher<
  T extends WatcherType = WatcherType,
  TFilters extends WatcherFilters = WatcherFilters,
> extends BaseWatcher<T> {
  /**
   * Watcher configuration:
   * - type: watcher type key ("request", "log", ...)
   * - graphMetrics: metric keys used by graph query
   * - filterExtractor: converts HTTP request into strongly typed filters
   */
  private config: WatcherConfig<T, TFilters>;

  /**
   * @param redisClient   Redis connection used by BaseWatcher (streams, etc.)
   * @param DBInstance    SQL database adapter providing query helpers
   * @param config        WatcherConfig describing how this watcher behaves
   */
  constructor(
    redisClient: RedisClientType,
    DBInstance: Database,
    config: WatcherConfig<T, TFilters>,
  ) {
    // BaseWatcher needs redis, DB, and the watcher type for namespacing.
    super(redisClient, DBInstance, config.type);
    this.config = config;
  }

  // ---------------------------------------------------------------------------
  // Table: overloads provide better typing so callers get the right result shape
  // based on index="instance" vs index="group".
  // ---------------------------------------------------------------------------

  /**
   * Table query in instance mode:
   * returns raw rows (each entry is a single event/record).
   */
  protected async getTableData(
    filters: WatcherFilters & { index: "instance" },
  ): Promise<TableDataResponse<T, "instance">>;

  /**
   * Table query in group mode:
   * returns aggregated rows grouped by the watcher's group key (route, queue, etc).
   */
  protected async getTableData(
    filters: WatcherFilters & { index: "group" },
  ): Promise<TableDataResponse<T, "group">>;

  /**
   * Table query with either index:
   * used by implementation to satisfy both overloads above.
   */
  protected async getTableData(
    filters: WatcherFilters & { index: "instance" | "group" },
  ): Promise<TableDataResponse<T, "instance" | "group">>;

  /**
   * Implementation for table data.
   * Chooses between DBInstance.getByInstance and DBInstance.getByGroup based on index.
   * Always returns { results, count } with count formatted (string, human-readable).
   */
  protected async getTableData(
    filters: WatcherFilters & { index: "instance" | "group" },
  ): Promise<{
    results: WatcherResults<T, "instance"> | WatcherResults<T, "group">;
    count: string;
  }> {
    if (filters.index === "instance") {
      // Instance mode: direct rows, no aggregation.
      const { results, count } = await this.DBInstance.getByInstance(
        filters,
        this.config.type,
      );

      return {
        results: results as WatcherResults<T, "instance">,
        count: formatValue(count, true),
      };
    } else {
      // Group mode: aggregated rows based on watcher grouping rules.
      const { results, count } = await this.DBInstance.getByGroup(
        filters,
        this.config.type,
      );

      return {
        results: results as WatcherResults<T, "group">,
        count: formatValue(count, true),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Graph: returns time-bucketed series for charts (counts, durations, etc.)
  // ---------------------------------------------------------------------------

  /**
   * Graph query:
   * Delegates to DBInstance.getGraphData and passes watcher-specific metric keys.
   * graphMetrics comes from config and determines which series are computed.
   */
  protected async getCountGraphData(
    filters: FiltersByWatcherType[T],
  ): Promise<CountGraphDataResponse> {
    return await this.DBInstance.getCountGraphData(
      filters,
      this.type,
      this.config.graphMetrics as string[],
    );
  }

  /**
   * Graph query:
   * Delegates to DBInstance.getGraphData and passes watcher-specific metric keys.
   * graphMetrics comes from config and determines which series are computed.
   */
  protected async getDurationGraphData(
    filters: FiltersByWatcherType[T],
  ): Promise<DurationGraphDataResponse> {
    return await this.DBInstance.getDurationGraphData(
      filters,
      this.type,
    );
  }

  // ---------------------------------------------------------------------------
  // View: returns a single entry + related entries (request/job/schedule linkage)
  // ---------------------------------------------------------------------------

  /**
   * View query:
   * Retrieves one entry by UUID, then loads "related" entries that share:
   * - request_id and/or
   * - schedule_id and/or
   * - job_id
   *
   * Output is grouped by entry "type" (request/log/query/job/etc) using groupItemsByType.
   */
  protected async getViewdata(id: string): Promise<ViewDataResponse> {
    // Primary entry being viewed.
    const entry = await this.DBInstance.getEntry(id);

    // Determine whether this entry has linkage identifiers.
    const hasRequestId = entry?.request_id && entry.request_id !== "null";
    const hasScheduleId = entry?.schedule_id && entry.schedule_id !== "null";
    const hasJobId = entry?.job_id && entry.job_id !== "null";

    // If the entry is standalone (no IDs to link on), just return itself grouped by type.
    if (!hasRequestId && !hasScheduleId && !hasJobId) {
      return groupItemsByType([entry]);
    }

    /**
     * Build a dynamic WHERE fragment + bound params based on which IDs exist.
     * conditions becomes an array like:
     *   ["request_id = ?", "job_id = ?"]
     * params becomes:
     *   ["req-123", "job-456"]
     */
    const conditions = [
      ...(hasRequestId ? ["request_id = ?"] : []),
      ...(hasScheduleId ? ["schedule_id = ?"] : []),
      ...(hasJobId ? ["job_id = ?"] : []),
    ];

    const params = [
      ...(hasRequestId ? [entry.request_id!] : []),
      ...(hasScheduleId ? [entry.schedule_id!] : []),
      ...(hasJobId ? [entry.job_id!] : []),
    ];

    /**
     * Extra job filter:
     * If job_id is present, only include jobs with terminal/interesting statuses.
     * This prevents unrelated job-state noise from showing up in view relations.
     *
     * NOTE: This relies on job status stored in JSON within `content`.
     */
    const jobCondition = hasJobId
      ? "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')"
      : "";

    // Fetch related entries based on conditions + jobCondition.
    const relatedEntries = await this.DBInstance.getRelatedViewdata(
      conditions,
      params,
      this.type,
      jobCondition,
    );

    // Remove null/undefined rows defensively (DB helper may return nulls).
    const validEntries = [entry, ...relatedEntries].filter((e) => e != null);
    return groupItemsByType(validEntries);
  }

  // ---------------------------------------------------------------------------
  // Related metadata endpoint (POST /{id}/related)
  // ---------------------------------------------------------------------------

  /**
   * Metadata query:
   * Similar to getViewdata but driven by explicit IDs passed in the body.
   * Used when the UI wants to fetch related items without first fetching the entry.
   */
  protected async getMetadata({
    requestId,
    jobId,
    scheduleId,
  }: {
    requestId: string;
    jobId: string;
    scheduleId: string;
  }): Promise<any> {
    if (!requestId && !jobId && !scheduleId) {
      return null;
    }

    const conditions = [
      ...(requestId && requestId !== 'null' ? [`request_id = ?`] : []),
      ...(jobId && jobId !== 'null' ? [`job_id = ?`] : []),
      ...(scheduleId && scheduleId !== 'null' ? [`schedule_id = ?`] : []),
    ];

    const params = [
      ...(requestId && requestId !== 'null' ? [requestId] : []),
      ...(jobId && jobId !== 'null' ? [jobId] : []),
      ...(scheduleId && scheduleId !== 'null' ? [scheduleId] : []),
    ];

    const jobCondition = jobId && jobId !== 'null'
      ? "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')"
      : "";

    const results = await this.DBInstance.getRelatedViewdata(
      conditions,
      params,
      this.type,
      jobCondition,
    );
    return groupItemsByType(results);
  }

  // ---------------------------------------------------------------------------
  // Filter extraction: watcher-specific mapping from request -> filters
  // ---------------------------------------------------------------------------

  /**
   * Extracts filters from the incoming HTTP request using config.filterExtractor.
   * This keeps GenericWatcher reusable: each watcher defines how to interpret query params.
   */
  protected extractFiltersFromRequest(
    req: ObservatoryBoardRequest,
  ): TFilters & WatcherFilters {
    return this.config.filterExtractor(req) as TFilters & WatcherFilters;
  }
}

export default GenericWatcher;
