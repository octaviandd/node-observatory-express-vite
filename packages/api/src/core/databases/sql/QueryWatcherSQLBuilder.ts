/** @format */

import { BaseBuilder } from "./BaseBuilder";

class QueryWatcherSQL extends BaseBuilder {
	/**
	 * Helper for query-specific status filtering (CRUD type)
	 */
	private getQueryStatusSQL(status: string | undefined): string {
		if (!status || status === "all") return "";

		// Use metadata.sqlType instead of parsing the SQL string
		const sqlType = status.toUpperCase();
		return `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.metadata.sqlType')) = '${sqlType}'`;
	}

	/**
	 * Data for the "Instance" (flat list) view
	 */
	public getIndexTableDataByInstanceSQL(filters: QueryFilters) {
		const { period, limit, offset, query, status, key } = filters;

		const periodSql = this.getPeriodSQL(period);
		const querySql = query ? this.getInclusionSQL(query, "query") : "";
		const keySql = key ? this.getEqualitySQL(key, "data.sql") : "";
		const statusSql = this.getQueryStatusSQL(status);

		const whereClause = `WHERE type = 'query' ${periodSql} ${querySql} ${statusSql} ${keySql}`;

		return {
			items: `SELECT * FROM observatory_entries ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};`,
			count: `SELECT COUNT(*) as total FROM observatory_entries ${whereClause};`,
		};
	}

	/**
	 * Data for the "Grouped" (aggregated by SQL statement) view
	 */
	public getIndexTableDataByGroupSQL(filters: QueryFilters) {
		const { period, limit, offset, query } = filters;

		const periodSql = this.getPeriodSQL(period);
		const querySql = query ? this.getInclusionSQL(query, "endpoint") : "";

		const whereClause = `WHERE type = 'query' ${periodSql} ${querySql}`;

		const columns = [
			"JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.sql')) as endpoint",
			"COUNT(*) as total",
			"AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL)) as duration",
			"SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed",
			"SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed",
			"CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
			"CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
			"CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
			this.getP95SQL("query"),
		];

		return {
			items: `
        SELECT ${columns.join(", ")}
        FROM observatory_entries
        ${whereClause}
        GROUP BY endpoint
        ORDER BY total DESC
        LIMIT ${limit} OFFSET ${offset};`,
			count: `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.sql'))) as total FROM observatory_entries ${whereClause};`,
		};
	}

	/**
	 * Logic for the Query Graph (Aggregates + Rows)
	 */
	public getIndexGraphDataSQL(filters: QueryFilters) {
		const { period, key, status } = filters;
		const periodSql = this.getPeriodSQL(period);
		const keySql = key ? this.getEqualitySQL(key, "data.sql") : "";
		const statusSql = status ? this.getQueryStatusSQL(status) : "";

		const aggregateColumns = [
			"COUNT(*) as total",
			"CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
			"CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
			"CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
			"SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed",
			"SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed",
			this.getP95SQL("query"),
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

		const whereClause = `WHERE type = 'query' ${periodSql} ${keySql} ${statusSql}`;

		return `
      (SELECT ${aggregateColumns.join(", ")} FROM observatory_entries ${whereClause})
      UNION ALL
      (SELECT ${rowColumns.join(", ")} FROM observatory_entries ${whereClause} ORDER BY created_at DESC);
    `;
	}
}

export default QueryWatcherSQL;
