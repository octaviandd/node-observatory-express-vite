/** @format */

import { RedisClientType } from "redis";
import { BaseWatcher } from "./BaseWatcher";
import Database from "../databases/sql/Base.js";
import { formatValue, groupItemsByType } from "../helpers/helpers";

interface WatcherConfig<TFilters = any> {
  type: string;
  graphMetrics: readonly string[];
  filterExtractor: (req: ObservatoryBoardRequest) => TFilters;
}

class GenericWatcher extends BaseWatcher {
  private config: WatcherConfig;

  constructor(
    redisClient: RedisClientType,
    DBInstance: Database,
    config: WatcherConfig,
  ) {
    super(redisClient, DBInstance, config.type as WatcherType);
    this.config = config;
  }

  protected async getTableData(
    filters: any,
  ): Promise<{ results: any; count: string }> {
    if (filters.index === "instance") {
      const { results, count } = await this.DBInstance.getByInstance(
        filters,
        this.type,
      );
      return { results, count: formatValue(count, true) };
    } else {
      const { results, count } = await this.DBInstance.getByGroup(
        filters,
        this.type,
      );
      return { results, count: formatValue(count, true) };
    }
  }

  protected async getViewdata(id: string): Promise<any> {
    const entry = await this.DBInstance.getEntry(id);

    const hasRequestId = entry?.request_id && entry.request_id !== "null";
    const hasScheduleId = entry?.schedule_id && entry.schedule_id !== "null";
    const hasJobId = entry?.job_id && entry.job_id !== "null";

    if (!hasRequestId && !hasScheduleId && !hasJobId) {
      return groupItemsByType([entry]);
    }

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

    const jobCondition = hasJobId
      ? "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')"
      : "";

    const relatedEntries = await this.DBInstance.getRelatedViewdata(
      conditions,
      params,
      this.type,
      jobCondition,
    );

    const validEntries = relatedEntries.filter((e) => e != null);

    return groupItemsByType(validEntries);
  }

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
      ...(requestId ? [`AND request_id = ?`] : []),
      ...(jobId ? [`AND job_id = ?`] : []),
      ...(scheduleId ? [`AND schedule_id = ?`] : []),
    ];

    const params = [
      ...(requestId ? [requestId] : []),
      ...(scheduleId ? [scheduleId] : []),
      ...(jobId ? [jobId] : []),
    ];

    const jobCondition = jobId
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

  protected async getGraphData(filters: any): Promise<any> {
    return await this.DBInstance.getGraphData(
      filters,
      this.type,
      this.config.graphMetrics as string[],
    );
  }

  protected extractFiltersFromRequest(req: ObservatoryBoardRequest): any {
    return this.config.filterExtractor(req);
  }
}

export default GenericWatcher;
