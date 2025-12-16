/** @format */

import { Request } from "express";
import { BaseWatcher } from "./BaseWatcher";
import { RedisClientType } from "redis";
import Database from '../database-sql';
import { formatValue, groupItemsByType } from "../../src/helpers/helpers";

class HTTPClientWatcher extends BaseWatcher {
  constructor(redisClient: RedisClientType, DBInstance: Database) {
    super(redisClient, DBInstance, 'http');
  };

  protected async getData(filters: CacheFilters): Promise<{ results: any, count: string}> {
    if (filters.index === 'instance') {
      const results = await this.DBInstance.getInstanceData(filters, this.type);
      const countResults = await this.DBInstance.getEntriesCount(filters, this.type);

      return { results, count: formatValue(countResults.total, true) };
    } else {
      const results = await this.DBInstance.getIndexData(filters, this.type);
      const countResult = await this.DBInstance.getEntriesCountByGroup(filters, this.type);

      return {results, count: formatValue(countResult.total, true)};
    }
  }

  protected async getViewdata(id: string): Promise<any> {
    const entry = await this.DBInstance.getEntry(id);

    if (!entry.requestId && !entry.scheduleId && !entry.jobId) return groupItemsByType([entry]);

    const conditions = [...(entry.requestId ? ["request_id = ?"] : []), ...(entry.scheduleId ? ["schedule_id = ?"] : []), ...(entry.jobId ? ["job_id = ?"] : [])];
    const params = [...(entry.requestId ? [entry.requestId] : []), ...(entry.scheduleId ? [entry.scheduleId] : []), ...(entry.jobId ? [entry.jobId] : [])];

    const jobCondition = entry.jobId ? "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')" : "";

    const relatedEntries = await this.DBInstance.getRelatedViewdata(conditions, params, this.type, jobCondition);
    return groupItemsByType(relatedEntries.concat(entry));
  }

  protected async getMetadata({ requestId, jobId, scheduleId }: { requestId: string, jobId: string, scheduleId: string }): Promise<any> {
    if (!requestId && !jobId && !scheduleId) return null;
    
    const conditions = [...(requestId ? [`AND request_id = ?`] : []), ...(jobId ? [`AND job_id = ?`] : []), ...(scheduleId ? [`AND schedule_id = ?`] : [])]
    const params = [...(requestId ? [requestId] : []), ...(scheduleId ? [scheduleId] : []), ...(jobId ? [jobId] : [])];
    const jobCondition = jobId ? "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')" : "";

    const results = await this.DBInstance.getRelatedViewdata(conditions, params, this.type, jobCondition)
    return groupItemsByType(results);
  }

  protected async getGraphData(filters: CacheFilters): Promise<any> {
    return await this.DBInstance.getGraphData(filters, this.type, ['hits', 'misses', 'writes'])  
  }

  protected extractFiltersFromRequest(req: Request): HTTPClientFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      query: req.query.q as string,
      isTable: req.query.table === "true",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      index: req.query.index as "instance" | "group",
      status: req.query.status as "all" | "2xx" | "4xx" | "5xx",
      key: req.query.key
        ? decodeURIComponent(req.query.key as string)
        : undefined,
    };
  }
}

export default HTTPClientWatcher;
