import { BaseBuilder } from "./BaseBuilder";

class LogWatcherSQL extends BaseBuilder {
  /**
   * Helper for log-specific level filtering
   */
  private getLogTypeSQL(logType: string): string {
    if (!logType || logType.toLowerCase() === "all") return "";

    const types = logType.split(",");
    const conditions = types.map(
      (type) => `JSON_EXTRACT(content, '$.level') LIKE '%${type.toLowerCase()}%'`
    );

    return `AND (${conditions.join(" OR ")})`;
  }

  /**
   * Data for the "Instance" (flat list) view
   */
  public getIndexTableDataByInstanceSQL(filters: any) {
    const { limit, offset, logType, query, key, period } = filters;

    const typeSql = this.getLogTypeSQL(logType);
    const querySql = query ? this.getInclusionSQL(query, "message") : "";
    const messageSql = key ? `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.message')) = '${key}'` : "";
    const periodSql = period ? this.getPeriodSQL(period) : "";

    const whereClause = `WHERE type = 'log' ${typeSql} ${querySql} ${messageSql} ${periodSql}`;

    return {
      items: `SELECT * FROM observatory_entries ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};`,
      count: `SELECT COUNT(*) as total FROM observatory_entries ${whereClause};`,
    };
  }

  /**
   * Data for the "Grouped" (aggregated by message) view
   */
  public getIndexTableDataByGroupSQL(filters: any) {
    const { limit, offset, query, period } = filters;

    const querySql = query ? this.getInclusionSQL(query, "message") : "";
    const periodSql = period ? this.getPeriodSQL(period) : "";

    const levels = ["info", "warn", "error", "debug", "trace", "fatal", "log"];
    const levelSumColumns = levels.map(
      (lvl) => `SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE '${lvl}' THEN 1 ELSE 0 END) as ${lvl}`
    );

    const columns = [
      "JSON_UNQUOTE(JSON_EXTRACT(content, '$.message')) as message",
      "COUNT(*) as total",
      ...levelSumColumns,
    ];

    const whereClause = `WHERE type = 'log' ${querySql} ${periodSql}`;

    return {
      items: `
        SELECT ${columns.join(", ")}
        FROM observatory_entries
        ${whereClause}
        GROUP BY message
        ORDER BY total DESC
        LIMIT ${limit} OFFSET ${offset};`,
      count: `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.message'))) as total FROM observatory_entries ${whereClause};`,
    };
  }

  /**
   * Logic for the Log Graph (Aggregate counts by level + Rows)
   */
  public getIndexGraphDataSQL(filters: any) {
    const { period, key } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const messageSql = key ? `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.message')) = '${key}'` : "";

    const levels = ["info", "warn", "error", "log", "debug", "trace", "fatal"];

    const aggregateColumns = [
      "COUNT(*) as total",
      ...levels.map(lvl => `SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE '${lvl}' THEN 1 ELSE 0 END) as ${lvl}`),
      "NULL as created_at",
      "NULL as content",
      "'aggregate' as type"
    ];

    const rowColumns = [
      "NULL as total",
      ...levels.map(lvl => `NULL as ${lvl}`),
      "created_at",
      "content",
      "'row' as type"
    ];

    const whereClause = `WHERE type = 'log' ${periodSql} ${messageSql}`;

    return `
      (SELECT ${aggregateColumns.join(", ")} FROM observatory_entries ${whereClause})
      UNION ALL
      (SELECT ${rowColumns.join(", ")} FROM observatory_entries ${whereClause} ORDER BY created_at DESC);
    `;
  }
}

export default LogWatcherSQL;