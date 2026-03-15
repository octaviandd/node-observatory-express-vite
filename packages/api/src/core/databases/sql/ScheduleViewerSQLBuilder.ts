/** @format */

import { BaseBuilder } from "./BaseBuilder";

class ScheduleWatcherSQL extends BaseBuilder {
  /**
   * Helper for schedule-specific status filtering
   */
  private getStatusSQL(status: string | undefined): string {
    if (!status || status === "all") {
      return "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) IN ('completed', 'failed'))";
    }

    return `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = '${status}'`;
  }

  /**
   * Data for the "Instance" (individual runs) view
   */
  public getIndexTableDataByInstanceSQL(filters: ScheduleFilters) {
    const { offset, limit, query, period, key, status } = filters;

    const periodSql = this.getPeriodSQL(period);
    const querySql = query
      ? this.getInclusionSQL(query, "metadata.scheduleId")
      : "";
    const scheduleSql = key
      ? this.getEqualitySQL(key, "metadata.scheduleId")
      : "";
    const statusSql = this.getStatusSQL(status);

    const whereClause = `WHERE type = 'schedule' ${statusSql} ${querySql} ${periodSql} ${scheduleSql}`;

    return {
      items: `SELECT * FROM observatory_entries ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};`,
      count: `SELECT COUNT(*) AS total FROM observatory_entries ${whereClause};`,
    };
  }

  /**
   * Data for the "Grouped" (aggregated by schedule ID) view
   */
  public getIndexTableDataByGroupSQL(filters: ScheduleFilters) {
    const { offset, limit, period, status, query } = filters;

    const timeSql = this.getPeriodSQL(period);
    const querySql = query
      ? this.getInclusionSQL(query, "metadata.scheduleId")
      : "";

    const columns = [
      "JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.scheduleId')) AS scheduleId",
      "COUNT(*) as total",
      "GROUP_CONCAT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.cronExpression'))) AS cronExpression",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed",
      "CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
      "CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
      this.getP95SQL("schedule"),
    ];

    const whereClause = `
      WHERE type = 'schedule' ${timeSql} ${querySql} 
      AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) IN ('completed', 'failed'))
    `;

    return {
      items: `
        SELECT ${columns.join(", ")}
        FROM observatory_entries
        ${whereClause}
        GROUP BY scheduleId
        LIMIT ${limit} OFFSET ${offset};`,
      count: `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.scheduleId'))) as total FROM observatory_entries ${whereClause};`,
    };
  }

  /**
   * Logic for the Schedule Graph (Aggregates + Chronological Rows)
   */
  public getIndexGraphDataSQL(filters: ScheduleFilters) {
    const { period, key, status } = filters;
    const timeSql = period ? this.getPeriodSQL(period) : "";
    const scheduleKeySql = key
      ? this.getEqualitySQL(key, "metadata.scheduleId")
      : "";
    const statusSql = this.getStatusSQL(status);

    const aggregateColumns = [
      "COUNT(*) as total",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed",
      "CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
      "CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
      this.getP95SQL("schedule"),
      "NULL as created_at",
      "NULL as content",
      "'aggregate' as type",
    ];

    const rowColumns = [
      "NULL as total",
      "NULL as completed",
      "NULL as failed",
      "NULL as shortest",
      "NULL as longest",
      "NULL as average",
      "NULL as p95",
      "created_at",
      "content",
      "'row' as type",
    ];

    const whereClause = `WHERE type = 'schedule' ${timeSql} ${scheduleKeySql} ${statusSql}`;

    return `
      (SELECT ${aggregateColumns.join(", ")} FROM observatory_entries ${whereClause})
      UNION ALL
      (SELECT ${rowColumns.join(", ")} FROM observatory_entries ${whereClause} ORDER BY created_at DESC);
    `;
  }
}

export default ScheduleWatcherSQL;
