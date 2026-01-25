import { BaseBuilder } from "./BaseBuilder";

class ViewWatcherSQL extends BaseBuilder {
  /**
   * Data for the "Instance" (flat list of view renders) view
   */
  public getIndexTableDataByInstanceSQL(filters: any) {
    const { query, offset, limit, path, period, status } = filters;

    const querySql = query ? this.getInclusionSQL(query, "view") : "";
    const pathSql = path ? this.getInclusionSQL(path, "view") : "";
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const statusSql = status && status !== "all" ? this.getEqualitySQL(status, "status") : "";

    const whereClause = `WHERE type = 'view' ${querySql} ${pathSql} ${periodSql} ${statusSql}`;

    return {
      items: `SELECT * FROM observatory_entries ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};`,
      count: `SELECT COUNT(*) as total FROM observatory_entries ${whereClause};`,
    };
  }

  /**
   * Data for the "Grouped" (aggregated by view template/name) view
   */
  public getIndexTableDataByGroupSQL(filters: any) {
    const { offset, limit, query, period } = filters;

    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, "view") : "";

    const columns = [
      "JSON_UNQUOTE(JSON_EXTRACT(content, '$.view')) as view",
      "COUNT(*) as total",
      "CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
      "CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.size')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as size",
      this.getP95SQL("view")
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
      count: `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.view'))) as total FROM observatory_entries ${whereClause};`,
    };
  }

  /**
   * Logic for the View Graph (Aggregates + Chronological Rows)
   */
  public getIndexGraphDataSQL(filters: any) {
    const { period, path } = filters;

    const periodSql = period ? this.getPeriodSQL(period) : "";
    const pathSql = path ? this.getInclusionSQL(path, "view") : "";

    const aggregateColumns = [
      "COUNT(*) as total",
      "CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
      "CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed",
      this.getP95SQL("view"),
      "NULL as created_at",
      "NULL as content",
      "'aggregate' as type"
    ];

    const rowColumns = [
      "NULL as total", "NULL as shortest", "NULL as longest", "NULL as average",
      "NULL as completed", "NULL as failed", "NULL as p95",
      "created_at", "content", "'row' as type"
    ];

    const whereClause = `WHERE type = 'view' ${periodSql} ${pathSql}`;

    return `
      (SELECT ${aggregateColumns.join(", ")} FROM observatory_entries ${whereClause})
      UNION ALL
      (SELECT ${rowColumns.join(", ")} FROM observatory_entries ${whereClause} ORDER BY created_at DESC);
    `;
  }
}

export default ViewWatcherSQL;