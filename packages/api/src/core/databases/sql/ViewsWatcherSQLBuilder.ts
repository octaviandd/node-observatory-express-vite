/** @format */

import { BaseBuilder } from "./BaseBuilder";

class ViewWatcherSQL extends BaseBuilder {
  /**
   * Helper for view-specific status filtering
   */
  private getStatusSQL(status: string | undefined): string {
    if (!status || status === "all") return "";
    return this.getEqualitySQL(status, "data.status");
  }

  /**
   * Data for the "Instance" (flat list of view renders) view
   */
  public getIndexTableDataByInstanceSQL(filters: ViewFilters) {
    const { query, offset, limit, key, period, status } = filters;

    const querySql = query ? this.getInclusionSQL(query, "data.view") : "";
    const viewSql = key ? this.getEqualitySQL(key, "data.view") : "";
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const statusSql = this.getStatusSQL(status);

    const whereClause = `WHERE type = 'view' ${querySql} ${viewSql} ${periodSql} ${statusSql}`;

    return {
      items: `SELECT * FROM observatory_entries ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};`,
      count: `SELECT COUNT(*) as total FROM observatory_entries ${whereClause};`,
    };
  }

  /**
   * Data for the "Grouped" (aggregated by view template/name) view
   */
  public getIndexTableDataByGroupSQL(filters: ViewFilters) {
    const { offset, limit, query, period } = filters;

    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, "data.view") : "";

    const columns = [
      "JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.view')) as view",
      "COUNT(*) as total",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'completed' THEN 1 ELSE 0 END) as completed",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'failed' THEN 1 ELSE 0 END) as failed",
      "CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
      "CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.size')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as size",
      this.getP95SQL("view"),
    ];

    const whereClause = `WHERE type = 'view' ${querySql} ${periodSql}`;

    return {
      items: `
        SELECT ${columns.join(", ")}
        FROM observatory_entries
        ${whereClause}
        GROUP BY view
        ORDER BY total DESC
        LIMIT ${limit} OFFSET ${offset};`,
      count: `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.view'))) as total FROM observatory_entries ${whereClause};`,
    };
  }

  /**
   * Logic for the View Graph (Aggregates + Chronological Rows)
   */
  public getIndexGraphDataSQL(filters: ViewFilters) {
    const { period, key, status } = filters;

    const periodSql = period ? this.getPeriodSQL(period) : "";
    const viewSql = key ? this.getEqualitySQL(key, "data.view") : "";
    const statusSql = this.getStatusSQL(status);

    const aggregateColumns = [
      "COUNT(*) as total",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'completed' THEN 1 ELSE 0 END) as completed",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'failed' THEN 1 ELSE 0 END) as failed",
      "CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
      "CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
      this.getP95SQL("view"),
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

    const whereClause = `WHERE type = 'view' ${periodSql} ${viewSql} ${statusSql}`;

    return `
      (SELECT ${aggregateColumns.join(", ")} FROM observatory_entries ${whereClause})
      UNION ALL
      (SELECT ${rowColumns.join(", ")} FROM observatory_entries ${whereClause} ORDER BY created_at DESC);
    `;
  }
}

export default ViewWatcherSQL;
