import { BaseBuilder } from "./BaseBuilder";

class MailWatcherSQL extends BaseBuilder {
  /**
   * Helper for mail-specific status filtering
   */
  private getStatusSQL(status: string | undefined): string {
    if (!status || status === "all") return "";
    
    const value = status === "completed" ? "completed" : "failed";
    return `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = '${value}'`;
  }

  /**
   * Data for the "Instance" (flat list) view
   */
  public getIndexTableDataByInstanceSQL(filters: any) {
    const { limit, offset, status, key, query, period } = filters;

    const periodSql = period ? this.getPeriodSQL(period) : "";
    const statusSql = this.getStatusSQL(status);
    // Use JSON_CONTAINS to search in the array
    const mailToSql = key ? `AND JSON_CONTAINS(JSON_EXTRACT(content, '$.data.to'), '"${key}"')` : "";
    const querySql = query ? this.getInclusionSQL(query, "data.subject") : "";

    const whereClause = `WHERE type = 'mail' ${periodSql} ${statusSql} ${mailToSql} ${querySql}`;

    return {
      items: `SELECT * FROM observatory_entries ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};`,
      count: `SELECT COUNT(*) AS total FROM observatory_entries ${whereClause};`,
    };
  }

  /**
   * Data for the "Grouped" (aggregated by recipient) view
   */
  public getIndexTableDataByGroupSQL(filters: any) {
    const { offset, limit, period, query } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, "data.subject") : "";

    const columns = [
      // Extract first email from the to array
      "JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.to[0]')) as mail_to",
      "COUNT(*) as total",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed_count",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as success_count",
      "CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
      "CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
      this.getP95SQL("mail")
    ];

    const whereClause = `WHERE type = 'mail' ${periodSql} ${querySql}`;

    return {
      items: `
        SELECT ${columns.join(", ")}
        FROM observatory_entries
        ${whereClause}
        GROUP BY mail_to
        ORDER BY total DESC
        LIMIT ${limit} OFFSET ${offset};`,
      count: `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.to[0]'))) as total FROM observatory_entries ${whereClause};`,
    };
  }

  /**
   * Logic for the Mail Graph (Aggregate counts + Rows)
   */
  public getIndexGraphDataSQL(filters: any) {
    const { period, key, status } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const statusSql = this.getStatusSQL(status);
    const keySql = key ? `AND JSON_CONTAINS(JSON_EXTRACT(content, '$.data.to'), '"${key}"')` : "";

    const aggregateColumns = [
      "COUNT(*) as total",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed",
      "CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
      "CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
      this.getP95SQL("mail"),
      "NULL as created_at",
      "NULL as content",
      "'aggregate' as type"
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
      "'row' as type"
    ];

    const whereClause = `WHERE type = 'mail' ${periodSql} ${statusSql} ${keySql}`;

    return `
      (SELECT ${aggregateColumns.join(", ")} FROM observatory_entries ${whereClause})
      UNION ALL
      (SELECT ${rowColumns.join(", ")} FROM observatory_entries ${whereClause} ORDER BY created_at DESC);
    `;
  }
}

export default MailWatcherSQL;