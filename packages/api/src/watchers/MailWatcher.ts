/** @format */

import { Request } from "express";
import { BaseWatcher } from "./BaseWatcher";
import Database from '../database-sql';
import { RedisClientType } from "redis";
import { formatValue, groupItemsByType } from "../../src/helpers/helpers";

class MailWatcher extends BaseWatcher {
  readonly type = "mail";

  constructor(redisClient: RedisClientType, DBInstance: Database) {
    super(redisClient, DBInstance, "mail");
  }

  protected async getData(filters: MailFilters): Promise<{ results: any, count: string }> {
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
    const entry = await this.DBInstance.getEntry(id);

    if (!entry.requestId && !entry.scheduleId && !entry.jobId) {
      return groupItemsByType([entry]);
    }

    const conditions = [
      ...(entry.requestId ? ["request_id = ?"] : []),
      ...(entry.scheduleId ? ["schedule_id = ?"] : []),
      ...(entry.jobId ? ["job_id = ?"] : [])
    ];
    const params = [
      ...(entry.requestId ? [entry.requestId] : []),
      ...(entry.scheduleId ? [entry.scheduleId] : []),
      ...(entry.jobId ? [entry.jobId] : [])
    ];

    const jobCondition = entry.jobId
      ? "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')"
      : "";

    const relatedEntries = await this.DBInstance.getRelatedViewdata(conditions, params, this.type, jobCondition);
    return groupItemsByType(relatedEntries.concat(entry));
  }

  protected async getMetadata({ requestId, jobId, scheduleId }: { requestId: string, jobId: string, scheduleId: string }): Promise<any> {
    if (!requestId && !jobId && !scheduleId) return null;

    const conditions = [
      ...(requestId ? [`AND request_id = ?`] : []),
      ...(jobId ? [`AND job_id = ?`] : []),
      ...(scheduleId ? [`AND schedule_id = ?`] : [])
    ];
    const params = [
      ...(requestId ? [requestId] : []),
      ...(scheduleId ? [scheduleId] : []),
      ...(jobId ? [jobId] : [])
    ];

    const jobCondition = jobId
      ? "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')"
      : "";

    const results = await this.DBInstance.getRelatedViewdata(conditions, params, this.type, jobCondition);
    return groupItemsByType(results);
  }

  protected async getGraphData(filters: MailFilters): Promise<any> {
    return await this.DBInstance.getGraphData(
      filters,
      this.type,
      ['completed', 'failed'],
      true // mail has duration
    );
  }

  protected extractFiltersFromRequest(req: Request): MailFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      query: req.query.q as string,
      isTable: req.query.table === "true",
      index: req.query.index as "instance" | "group",
      status: req.query.status as "completed" | "failed" | "all",
      key: req.query.key as string,
    };
  }
}

export default MailWatcher;