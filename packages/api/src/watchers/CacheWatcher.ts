/** @format */

import { Request } from "express";
import { BaseWatcher } from "./BaseWatcher";
import Database from '../database-sql';
import { RedisClientType } from "redis";
import { durationGraphData, formatValue, getLabel, groupItemsByType } from "src/helpers/helpers";
import { PERIODS } from "src/helpers/constants";


class CacheWatcher extends BaseWatcher {
  readonly type = "cache";

  constructor(redisClient: RedisClientType, DBInstance: Database) {
    super(redisClient, DBInstance);
  }

  /**
   * View Methods
   * --------------------------------------------------------------------------
   */
  protected async getViewData(id: string): Promise<any> {
    const entry = await this.DBInstance.getEntry(id);

    const conditions = [...(entry.reqest_id ? ["request_id = ?"] : []), ...(entry.schedule_id ? ["schedule_id = ?"] : []), ...(entry.job_id ? ["job_id = ?"] : [])];
    const params = [...(entry.reqest_id ? [entry.reqest_id] : []), ...(entry.schedule_id ? [entry.schedule_id] : []), ...(entry.job_id ? [entry.job_id] : [])];

    let jobCondition = entry.job_id ? "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')" : "";

    if (!entry.request_id && !entry.schedule_id && !entry.job_id) return groupItemsByType([entry]);

    const relatedEntries = await this.DBInstance.getRelatedViewData(conditions, params, this.type, jobCondition);
    return groupItemsByType(relatedEntries.concat(entry));
  }

  /**
   * Related Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getMetadata(
    modelId: string,
    requestId: string,
    jobId: string,
    scheduleId: string,
  ): Promise<any> {
    let query = "SELECT * FROM observatory_entries WHERE type != ?";

    if (requestId) {
      query += ` AND request_id = '${requestId}'`;
    }

    if (jobId) {
      let jobFilter =
        "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')";
      query += ` AND job_id = '${jobId}' ${jobFilter}`;
    }

    if (scheduleId) {
      query += ` AND schedule_id = '${scheduleId}'`;
    }

    if (!requestId && !jobId && !scheduleId) {
      return null;
    }

    const [results]: [any[], any] = await this.storeConnection.query(query, [
      this.type,
    ]);
    
    return groupItemsByType(results);
  }

  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByInstanceSQL(
    filters: CacheFilters,
  ): Promise<any> {
    const results = await this.DBInstance.getInstanceData(filters, this.type);
    const countResults = await this.DBInstance.getEntriesCount(filters, this.type);

    return { results, count: formatValue(countResults.total, true) };
  }

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByGroupSQL(
    filters: CacheFilters,
  ): Promise<any> {
    const { period, limit, offset, query, key } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, "stats") : "";
    const keySql = key ? this.getEqualitySQL(key, "key") : "";

    const [results] = (await this.storeConnection.query(
      `SELECT
      JSON_UNQUOTE(JSON_EXTRACT(content, '$.key')) as cache_key,
      COUNT(*) as total,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) > 0 THEN 1 ELSE 0 END) as misses,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) > 0 THEN 1 ELSE 0 END) as hits,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) > 0 THEN 1 ELSE 0 END) as writes,
      MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10, 6))) as shortest,
      MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10, 6))) as longest,
      AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10, 6))) as average,
      CAST(
        SUBSTRING_INDEX(
          SUBSTRING_INDEX(
            GROUP_CONCAT(
              CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))
              ORDER BY CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))
              SEPARATOR ','
            ),
            ',',
            CEILING(COUNT(*) * 0.95)
          ),
          ',',
          -1
        ) AS DECIMAL(10,2)
      ) AS p95
      FROM observatory_entries
      WHERE type = 'cache' ${periodSql} ${querySql} ${keySql} AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.wasSet')) IS NULL
      GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.key'))
      ORDER BY total DESC
      LIMIT ${limit} OFFSET ${offset}`,
    )) as [any];

    const [countResult] = (await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.key'))) as total FROM observatory_entries WHERE type = 'cache' ${periodSql} ${querySql} ${keySql} AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.wasSet')) IS NULL`,
    )) as [any[]];

    return {
      results, count: formatValue(countResult[0].total, true)
    };
  }

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */

  protected async getIndexGraphDataSQL(filters: CacheFilters): Promise<any> {
    const { period, key } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const keySql = key ? this.getEqualitySQL(key, "key") : "";

    const [results] = (await this.storeConnection.query(
      `(
        SELECT
          COUNT(*) as total,
          CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest,
          CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest,
          CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) > 0 THEN 1 ELSE 0 END) as misses,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) > 0 THEN 1 ELSE 0 END) as hits,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) > 0 THEN 1 ELSE 0 END) as writes,
          CAST(
            SUBSTRING_INDEX(
              SUBSTRING_INDEX(
                GROUP_CONCAT(
                  CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))
                  ORDER BY CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))
                  SEPARATOR ','
                ),
                ',',
                CEILING(COUNT(*) * 0.95)
              ),
              ',',
              -1
            ) AS DECIMAL(10,2)
          ) AS p95,
          NULL as created_at,
          NULL as content,
          'aggregate' as type
        FROM observatory_entries
        WHERE type = 'cache' ${periodSql} ${keySql}
      )
      UNION ALL
      (
        SELECT
          NULL as total,
          NULL as shortest,
          NULL as longest,
          NULL as average,
          NULL as p95,
          NULL as misses,
          NULL as hits,
          NULL as writes,
          created_at,
          content,
          'row' as type
        FROM observatory_entries
        WHERE type = 'cache' ${periodSql} ${keySql}
        ORDER BY created_at DESC
      );`,
    )) as [any[], any];

    const aggregateResults: {
      total: number;
      shortest: string | null;
      longest: string | null;
      average: string | null;
      misses: string | null;
      hits: string | null;
      writes: string | null;
      p95: string | null;
    } = results.shift();

    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = durationGraphData(results, period as string);

    return {
      countFormattedData,
      durationFormattedData,
      count: formatValue(aggregateResults.total, true),
      indexCountOne: formatValue(aggregateResults.hits, true),
      indexCountTwo: formatValue(aggregateResults.writes, true),
      indexCountThree: formatValue(aggregateResults.misses, true),
      shortest: formatValue(aggregateResults.shortest),
      longest: formatValue(aggregateResults.longest),
      average: formatValue(aggregateResults.average),
      p95: formatValue(aggregateResults.p95),
    };
  }

  /**
   * Helper Methods
   * --------------------------------------------------------------------------
   */
  protected countGraphData(data: any, period: string) {
    const totalDuration = PERIODS[period].duration;
    const intervalDuration = totalDuration / 120;
    const now = new Date().getTime();
    const startDate = now - totalDuration * 60 * 1000;

    const groupedData = Array.from({ length: 120 }, (_, index) => ({
      misses: 0,
      hits: 0,
      writes: 0,
      label: getLabel(index, period),
    }));

    data.forEach((cache: any) => {
      const cacheTime = new Date(cache.created_at).getTime();
      const hits = cache.content.hits ? 1 : 0;
      const misses = cache.content.misses ? 1 : 0;
      const writes = cache.content.writes ? 1 : 0;
      const intervalIndex = Math.floor(
        (cacheTime - startDate) / (intervalDuration * 60 * 1000),
      );

      if (intervalIndex >= 0 && intervalIndex < 120) {
        groupedData[intervalIndex] = {
          ...groupedData[intervalIndex],
          misses: groupedData[intervalIndex].misses + misses,
          hits: groupedData[intervalIndex].hits + hits,
          writes: groupedData[intervalIndex].writes + writes,
        };
      }
    });

    return groupedData;
  }

  protected extractFiltersFromRequest(req: Request): CacheFilters {
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
