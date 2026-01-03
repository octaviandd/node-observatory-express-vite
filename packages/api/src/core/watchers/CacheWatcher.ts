import { BaseWatcher } from "./BaseWatcher.js";
import Database from '../database-sql.js';
import { RedisClientType } from "redis";
import { formatValue, groupItemsByType } from "../helpers/helpers.js";


class CacheWatcher extends BaseWatcher {
  private static readonly VALID_CACHE_TYPES = ["all", "misses", "hits", "writes"] as const;

  constructor(redisClient: RedisClientType, DBInstance: Database) {
    super(redisClient, DBInstance, 'cache');
  }

  protected async getTableData(filters: CacheFilters): Promise<{ results: any, count: string}> {
    if (filters.index === 'instance') {
      const results = await this.DBInstance.getByInstance(filters, this.type);
      const count = await this.DBInstance.getByInstanceCount(filters, this.type);

      return { results, count: formatValue(count, true) };
    } else {
      const results = await this.DBInstance.getByGroup(filters, this.type);
      const count = await this.DBInstance.getByGroupCount(filters, this.type);

      return {results, count: formatValue(count, true)};
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

  protected extractFiltersFromRequest(req: ObservatoryBoardRequest): CacheFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      limit: parseInt(req.query.limit as string, 10) || 20,
      offset: parseInt(req.query.offset as string, 10) || 0,
      isTable: req.query.table === "true",
      index: req.query.index as "instance" | "group",
      query: req.query.q as string,
      cacheType: req.query.status as "all" | "misses" | "hits" | "writes",
      key: req.query.key as string,
    };
  }
}

export default CacheWatcher;
