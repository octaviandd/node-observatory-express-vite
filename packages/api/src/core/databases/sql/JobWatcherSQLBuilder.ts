/** @format */

import { BaseBuilder } from "./BaseBuilder";

class JobWatcherSQL extends BaseBuilder {
  /**
   * Job-specific status filter logic
   */
  private getJobStatusFilterSQL(status: string | undefined): string {
    if (!status || status === "all") {
      return "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) IN ('released', 'completed', 'failed'))";
    }
    return this.getEqualitySQL(status, "data.status");
  }

  /**
   * Data for the "Instance" (flat list) view
   * Includes custom status priority sorting
   */
  public getIndexTableDataByInstanceSQL(filters: JobFilters) {
    const { period, limit, offset, status, key } = filters;

    const periodSql = this.getPeriodSQL(period);
    const queueSql = key ? this.getEqualitySQL(key, "data.queue") : "";
    const statusSql = this.getJobStatusFilterSQL(status || "all");

    const whereClause = `
      WHERE type = 'job' 
      AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.method')) = 'processJob'
      ${statusSql} ${periodSql} ${queueSql}
    `;

    const itemsQuery = `
      SELECT *, 
        CASE 
          WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'failed' THEN 1
          WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'released' THEN 2
          WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'completed' THEN 3
          ELSE 4
        END AS status_priority
      FROM observatory_entries
      ${whereClause}
      ORDER BY created_at DESC, status_priority DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

    const countQuery = `SELECT COUNT(*) as total FROM observatory_entries ${whereClause};`;

    return { items: itemsQuery, count: countQuery };
  }

  /**
   * Data for the "Grouped" (aggregated by queue) view
   */
  public getIndexTableDataByGroupSQL(filters: JobFilters) {
    const { period, query, limit, offset, status } = filters;

    const periodSql = this.getPeriodSQL(period);
    const querySql = query ? this.getInclusionSQL(query, "data.queue") : "";

    // Dynamic ordering based on UI selection
    const orderMapping: Record<string, string> = {
      all: "ORDER BY total DESC",
      errors: "ORDER BY failed DESC",
      slow: "ORDER BY average DESC",
    };
    const orderBySql = orderMapping[status] || orderMapping.all;

    const columns = [
      "JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.queue')) AS queue",
      "COUNT(*) AS total",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'released' THEN 1 ELSE 0 END) AS released",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'completed' THEN 1 ELSE 0 END) AS completed",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'failed' THEN 1 ELSE 0 END) AS failed",
      "CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
      "CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
      this.getP95SQL("job"),
    ];

    const whereClause = `WHERE type = 'job' AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.method')) = 'processJob' ${periodSql} ${querySql}`;

    return {
      items: `
        SELECT ${columns.join(", ")}
        FROM observatory_entries
        ${whereClause}
        GROUP BY queue
        ${orderBySql}
        LIMIT ${limit} OFFSET ${offset};`,
      count: `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.queue'))) as total FROM observatory_entries ${whereClause};`,
    };
  }

  /**
   * Logic for the Job Graph (Aggregates + Rows) - Combined count and duration
   */
  public getIndexGraphDataSQL(filters: JobFilters) {
    const { period, key, status } = filters;
    const periodSql = this.getPeriodSQL(period);
    const queueSql = key ? this.getEqualitySQL(key, "data.queue") : "";
    const statusSql = this.getJobStatusFilterSQL(status || "all");

    const aggregateColumns = [
      "COUNT(*) as total",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'completed' THEN 1 ELSE 0 END) as completed",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'failed' THEN 1 ELSE 0 END) as failed",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'released' THEN 1 ELSE 0 END) as released",
      "CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
      "CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
      this.getP95SQL("job"),
      "NULL as created_at",
      "NULL as content",
      "'aggregate' as type",
    ];

    const rowColumns = [
      "NULL as total",
      "NULL as completed",
      "NULL as failed",
      "NULL as released",
      "NULL as shortest",
      "NULL as longest",
      "NULL as average",
      "NULL as p95",
      "created_at",
      "content",
      "'row' as type",
    ];

    const whereClause = `WHERE type = 'job' AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.method')) = 'processJob' ${periodSql} ${queueSql} ${statusSql}`;

    return `
      (SELECT ${aggregateColumns.join(", ")} FROM observatory_entries ${whereClause})
      UNION ALL
      (SELECT ${rowColumns.join(", ")} FROM observatory_entries ${whereClause} ORDER BY created_at DESC);
    `;
  }
}

export default JobWatcherSQL;
