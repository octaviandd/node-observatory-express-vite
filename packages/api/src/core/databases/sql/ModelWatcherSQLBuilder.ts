/** @format */

import { BaseBuilder } from "./BaseBuilder";

class ModelWatcherSQL extends BaseBuilder {
  /**
   * Helper for model-specific status filtering (completed vs failed)
   */
  private getStatusSQL(status: string | undefined): string {
    if (!status || status === "all") return "";
    return `AND JSON_EXTRACT(content, '$.data.status') = '${status}'`;
  }

  /**
   * Data for the "Instance" (flat list) view
   */
  public getIndexTableDataByInstanceSQL(filters: ModelFilters) {
    const { limit, offset, key, query, status } = filters;

    const modelSQL = key ? this.getEqualitySQL(key, "data.modelName") : "";
    const querySQL = query ? this.getInclusionSQL(query, "data.modelName") : "";
    const statusSQL = this.getStatusSQL(status);

    const whereClause = `WHERE type = 'model' ${modelSQL} ${querySQL} ${statusSQL}`;

    return {
      items: `SELECT * FROM observatory_entries ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};`,
      count: `SELECT COUNT(*) as total FROM observatory_entries ${whereClause};`,
    };
  }

  /**
   * Data for the "Grouped" (aggregated by model name) view
   */
  public getIndexTableDataByGroupSQL(filters: ModelFilters) {
    const { limit, offset, key, query } = filters;

    const modelSQL = key ? this.getEqualitySQL(key, "data.modelName") : "";
    const querySQL = query ? this.getInclusionSQL(query, "data.modelName") : "";

    const columns = [
      "JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.modelName')) as modelName",
      "COUNT(*) as total",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'success' THEN 1 ELSE 0 END) as count_success",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'error' THEN 1 ELSE 0 END) as count_error",
      "CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
      "CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
      this.getP95SQL("model"),
    ];

    const whereClause = `WHERE type = 'model' ${modelSQL} ${querySQL}`;

    return {
      items: `
        SELECT ${columns.join(", ")}
        FROM observatory_entries
        ${whereClause}
        GROUP BY modelName
        ORDER BY total DESC
        LIMIT ${limit} OFFSET ${offset};`,
      count: `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.modelName'))) as total FROM observatory_entries ${whereClause};`,
    };
  }

  /**
   * Logic for the Model Graph (Aggregate counts + Rows)
   */
  public getIndexGraphDataSQL(filters: ModelFilters) {
    const { period } = filters;
    const timeSql = period ? this.getPeriodSQL(period) : "";

    const aggregateColumns = [
      "COUNT(*) as total",
      "CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
      "CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'completed' THEN 1 ELSE 0 END) as completed",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.status')) = 'failed' THEN 1 ELSE 0 END) as failed",
      this.getP95SQL("model"),
      "NULL as created_at",
      "NULL as content",
      "'aggregate' as type",
    ];

    const rowColumns = [
      "NULL as total",
      "NULL as shortest",
      "NULL as longest",
      "NULL as average",
      "NULL as completed",
      "NULL as failed",
      "NULL as p95",
      "created_at",
      "content",
      "'row' as type",
    ];

    const whereClause = `WHERE type = 'model' ${timeSql}`;

    return `
      (SELECT ${aggregateColumns.join(", ")} FROM observatory_entries ${whereClause})
      UNION ALL
      (SELECT ${rowColumns.join(", ")} FROM observatory_entries ${whereClause} ORDER BY created_at DESC);
    `;
  }
}

export default ModelWatcherSQL;
