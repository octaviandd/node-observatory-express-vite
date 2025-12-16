import { Request } from "express";
import { BaseWatcher } from "./BaseWatcher";
import Database from '../database-sql';
import { RedisClientType } from "redis";
import { formatValue, groupItemsByType } from "../../src/helpers/helpers";

class RequestWatcher extends BaseWatcher {
  readonly type = "request";

  constructor(redisClient: RedisClientType, DBInstance: Database) {
    super(redisClient, DBInstance, "request");
  }

  protected async getData(filters: RequestFilters): Promise<{ results: any, count: string }> {
    if (filters.index === 'instance') {
      const results = await this.DBInstance.getInstanceData(filters, this.type);
      const countResults = await this.DBInstance.getEntriesCount(filters, this.type, '');

      return { results, count: formatValue(countResults.total, true) };
    } else {
      const results = await this.DBInstance.getIndexData(filters, this.type);
      const countResult = await this.DBInstance.getEntriesCountByGroup(filters, this.type, '');

      return { results, count: formatValue(countResult.total, true) };
    }
  }

  protected async getViewdata(id: string): Promise<any> {
    // Request has a unique view pattern - it fetches the entry AND all related entries by request_id
    const entry = await this.DBInstance.getEntry(id);
    
    if (!entry.requestId) {
      return groupItemsByType([entry]);
    }

    // For requests, we get all entries with matching request_id
    const conditions = ["request_id = ?"];
    const params = [entry.requestId];

    const relatedEntries = await this.DBInstance.getRelatedViewdata(conditions, params, '', '');
    return groupItemsByType(relatedEntries);
  }

  protected async getMetadata({ requestId, jobId, scheduleId }: { requestId: string, jobId: string, scheduleId: string }): Promise<any> {
    if (!requestId) return null;

    const conditions = [`AND request_id = ?`];
    const params = [requestId];

    const results = await this.DBInstance.getRelatedViewdata(conditions, params, this.type, '');
    return groupItemsByType(results);
  }

  protected async getGraphData(filters: RequestFilters): Promise<any> {
    return await this.DBInstance.getGraphData(
      filters,
      this.type,
      ['count_200', 'count_400', 'count_500'],
      true // request has duration
    );
  }

  protected extractFiltersFromRequest(req: Request): RequestFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      query: req.query.q as string,
      isTable: req.query.table === "true",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      index: req.query.index as "instance" | "group",
      status: req.query.status as "all" | "2xx" | "4xx" | "5xx",
      key: req.query.key ? decodeURIComponent(req.query.key as string) : "",
    };
  }
}

export default RequestWatcher;