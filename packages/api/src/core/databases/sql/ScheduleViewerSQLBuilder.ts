import { BaseBuilder } from "./BaseBuilder";

class ScheduleWatcherSQL extends BaseBuilder {
  /**
   * Helper for schedule-specific status and type filtering
   */
  private getStatusSQL(type: string | undefined): string {
    const base = "AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.type')) = 'processJob'";
    if (!type || type === "all") return base;
    
    return `${base} AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = '${type}'`;
  }

  /**
   * Data for the "Instance" (individual runs) view
   */
  public getIndexTableDataByInstanceSQL(filters: any) {
    const { offset, limit, query, period, key, status } = filters;
    
    const periodSql = this.getPeriodSQL(period);
    const querySql = query ? this.getInclusionSQL(query, "scheduleId") : "";
    const scheduleSql = key ? this.getEqualitySQL(key, "scheduleId") : "";
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
  public getIndexTableDataByGroupSQL(filters: any) {
    const { offset, limit, period, groupFilter, query } = filters;
    
    const timeSql = this.getPeriodSQL(period);
    const querySql = query ? this.getInclusionSQL(query, "jobId") : "";

    // Dynamic sorting based on UI selection
    let orderBySql = "ORDER BY total DESC";
    if (groupFilter === "errors") orderBySql = "ORDER BY failed DESC";
    if (groupFilter === "slow") orderBySql = "ORDER BY longest DESC";

    const columns = [
      "JSON_UNQUOTE(JSON_EXTRACT(content, '$.scheduleId')) AS scheduleId",
      "COUNT(*) as total",
      "GROUP_CONCAT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.cronExpression'))) AS cronExpression",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed",
      "CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
      "CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
      this.getP95SQL("schedule")
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
        ${orderBySql}
        LIMIT ${limit} OFFSET ${offset};`,
      count: `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.scheduleId'))) as total FROM observatory_entries ${whereClause};`,
    };
  }

  /**
   * Logic for the Schedule Graph (Aggregates + Chronological Rows)
   */
  public getIndexGraphDataSQL(filters: any) {
    const { period, key } = filters;
    const timeSql = this.getPeriodSQL(period);
    const scheduleKeySql = key ? this.getEqualitySQL(key, "scheduleId") : "";

    const aggregateColumns = [
      "COUNT(*) as total",
      "CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
      "CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed",
      this.getP95SQL("schedule"),
      "NULL as created_at", "NULL as content", "'aggregate' as type"
    ];

    const rowColumns = [
      "NULL as total", "NULL as shortest", "NULL as longest", "NULL as average",
      "NULL as completed", "NULL as failed", "NULL as p95",
      "created_at", "content", "'row' as type"
    ];

    const whereClause = `
      WHERE type = 'schedule' ${timeSql} ${scheduleKeySql} 
      AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) IN ('completed', 'failed'))
    `;

    return `
      (SELECT ${aggregateColumns.join(", ")} FROM observatory_entries ${whereClause})
      UNION ALL
      (SELECT ${rowColumns.join(", ")} FROM observatory_entries ${whereClause} ORDER BY created_at DESC);
    `;
  }
}

export default ScheduleWatcherSQL;