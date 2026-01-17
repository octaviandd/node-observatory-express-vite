/** @format */

import { BaseWatcher } from "./BaseWatcher.js";
import { RedisClientType } from "redis";
import Database from '../database-sql.js';
import { formatValue, groupItemsByType } from "../helpers/helpers.js";

class ExceptionWatcher extends BaseWatcher {
  constructor(redisClient: RedisClientType, DBInstance: Database) {
    super(redisClient, DBInstance, "exception");
  }

  protected async getTableData(filters: ExceptionFilters): Promise<{ results: any, count: string}> {
    if (filters.index === 'instance') {
      const results = await this.DBInstance.getByInstance(filters, this.type);
      const count = await this.DBInstance.getByInstanceCount(filters, this.type);

      return { results, count: formatValue(count, true) };
    } else {
      const results = await this.DBInstance.getByGroup(filters, this.type);
      const count = await this.DBInstance.getByGroupCount(filters, this.type);

      return { results, count: formatValue(count, true) };
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

  /**
   * Table Data Methods
   * --------------------------------------------------------------------------
   */
  // protected async getIndexTableDataSQL(
  //   filters: ExceptionFilters,
  // ): Promise<any> {
  //   const { limit, offset, type, query } = filters;
  //   const typeSQL = type ? this.getInclusionSQL(type, "type") : "";
  //   const querySQL = query ? this.getInclusionSQL(query, "message") : "";

  //   const [results] = await this.storeConnection.query(
  //     `SELECT * FROM observatory_entries 
  //      WHERE type = 'exception' ${typeSQL} ${querySQL} 
  //      ORDER BY created_at DESC 
  //      LIMIT ? OFFSET ?`,
  //     [limit, offset],
  //   );

  //   const [countResult] = await this.storeConnection.query(
  //     `SELECT COUNT(*) as total FROM observatory_entries 
  //      WHERE type = 'exception' ${typeSQL} ${querySQL}`,
  //   );

  //   return { results, count: countResult[0].total };
  // }

  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */

  // protected async getIndexTableDataByInstanceSQL(
  //   filters: ExceptionFilters,
  // ): Promise<any> {
  //   const { limit, offset, type, query, key } = filters;
  //   const typeSQL = type !== "all" ? this.getInclusionSQL(type, "type") : "";
  //   const querySQL = query ? this.getInclusionSQL(query, "message") : "";
  //   const keySQL = key ? this.getEqualitySQL(key, "message") : "";

  //   const [results] = await this.storeConnection.query(
  //     `SELECT * FROM observatory_entries
  //      WHERE type = 'exception' ${typeSQL} ${querySQL} ${keySQL}
  //      ORDER BY created_at DESC
  //      LIMIT ? OFFSET ?`,
  //     [limit, offset],
  //   );

  //   const [countResult] = await this.storeConnection.query(
  //     `SELECT COUNT(*) as total FROM observatory_entries
  //      WHERE type = 'exception' ${typeSQL} ${querySQL} ${keySQL}`,
  //   );

  //   return { results, count: this.formatValue(countResult[0].total, true) }
  // }

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
  // protected async getIndexTableDataByGroupSQL(
  //   filters: ExceptionFilters,
  // ): Promise<any> {
  //   const { period, limit, offset, query } = filters;
  //   const periodSQL = period ? this.getPeriodSQL(period) : "";
  //   const querySQL = query ? this.getInclusionSQL(query, "message") : "";

  //   const [results] = await this.storeConnection.query(
  //     `SELECT
  //       JSON_UNQUOTE(JSON_EXTRACT(content, '$.message')) as header,
  //       COUNT(*) as total,
  //       MIN(created_at) as first_seen,
  //       MAX(created_at) as last_seen
  //     FROM observatory_entries
  //     WHERE type = 'exception' ${periodSQL} ${querySQL}
  //     GROUP BY header
  //     ORDER BY total DESC
  //     LIMIT ? OFFSET ?`,
  //     [limit, offset],
  //   );

  //   const [countResult] = (await this.storeConnection.query(
  //     `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.message'))) as total FROM observatory_entries WHERE type = 'exception' ${periodSQL} ${querySQL}`,
  //   )) as [any[]];

  //   return {
  //     results, count: this.formatValue(countResult[0].total, true)
  //   };
  // }

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
  // protected async getIndexGraphDataSQL(
  //   filters: ExceptionFilters,
  // ): Promise<any> {
  //   const { period, key } = filters;
  //   const periodSql = period ? this.getPeriodSQL(period) : "";
  //   const keySql = key ? this.getEqualitySQL(key, "message") : "";

  //   const [results] = (await this.storeConnection.query(
  //     `(
  //       SELECT
  //         COUNT(*) as total,
  //         SUM(CASE WHEN JSON_EXTRACT(content, '$.type') = 'unhandledRejection' THEN 1 ELSE 0 END) as unhandledRejection,
  //         SUM(CASE WHEN JSON_EXTRACT(content, '$.type') = 'uncaughtException' THEN 1 ELSE 0 END) as uncaughtException,
  //         NULL as created_at,
  //         NULL as content,
  //         'aggregate' as type
  //       FROM observatory_entries
  //       WHERE type = 'exception' ${periodSql} ${keySql}
  //     )
  //     UNION ALL
  //     (
  //       SELECT
  //         NULL as total,
  //         NULL as unhandledRejection,
  //         NULL as uncaughtException,
  //         created_at,
  //         content,
  //         'row' as type
  //       FROM observatory_entries
  //       WHERE type = 'exception' ${periodSql} ${keySql}
  //       ORDER BY created_at DESC
  //     );`,
  //   )) as any[];

  //   const aggregateResults: {
  //     total: number;
  //     unhandledRejection: string | null;
  //     uncaughtException: string | null;
  //   } = results.shift() as any;

  //   const countFormattedData = this.countGraphData(results, period as string);

  //   return {
  //     countFormattedData,
  //     count: this.formatValue(aggregateResults.total, true),
  //     indexCountOne: this.formatValue(
  //       aggregateResults.unhandledRejection,
  //       true,
  //     ),
  //     indexCountTwo: this.formatValue(aggregateResults.uncaughtException, true),
  //   };
  // }

  protected async getGraphData(filters: ExceptionFilters): Promise<any> {
    return await this.DBInstance.getGraphData(filters, this.type, ['unhandeledRejection', 'uncaughtException'])  
  }

  protected extractFiltersFromRequest(req: ObservatoryBoardRequest): ExceptionFilters {
    return {
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      type: req.query.status as "all" | "unhandled" | "uncaught",
      query: req.query.q as string,
      isTable: req.query.table === "true",
      index: req.query.index as "instance" | "group",
      key: req.query.key as string,
    };
  }
}

export default ExceptionWatcher;
