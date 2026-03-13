/** @format */

import { BaseBuilder } from "./BaseBuilder";

class HTTPClientWatcherSQL extends BaseBuilder {
	/**
	 * Helper for HTTP-specific status code filtering (2xx, 4xx, 5xx)
	 */
	private getStatusSQL(status: string | undefined): string {
		if (!status || status === "all") return "";

		// Transforms '2xx' into '2%' for SQL LIKE
		const pattern = status.replace("xx", "%");
		return `AND JSON_EXTRACT(content, '$.data.statusCode') LIKE '${pattern}'`;
	}

	/**
	 * Data for the "Instance" (flat list) view
	 */
	public getIndexTableDataByInstanceSQL(filters: HTTPClientFilters) {
		const { period, query, status, key, limit, offset } = filters;

		const periodSql = this.getPeriodSQL(period);
		const querySql = query ? this.getInclusionSQL(query, "data.origin") : "";
		const keySql = key ? this.getInclusionSQL(key, "data.origin") : "";
		const statusSql = this.getStatusSQL(status);

		const whereClause = `
      WHERE type = 'http' 
      AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) != '0'
      ${periodSql} ${querySql} ${statusSql} ${keySql}
    `;

		return {
			items: `SELECT * FROM observatory_entries ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};`,
			count: `SELECT COUNT(*) AS total FROM observatory_entries ${whereClause};`,
		};
	}

	/**
	 * Data for the "Grouped" (aggregated by origin/route) view
	 */
	public getIndexTableDataByGroupSQL(filters: HTTPClientFilters) {
		const { period, query, key, limit, offset } = filters;

		const periodSql = this.getPeriodSQL(period);
		const querySql = query ? this.getInclusionSQL(query, "data.origin") : "";
		const keySql = key ? this.getEqualitySQL(key, "data.origin") : "";

		const columns = [
			"JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.origin')) AS route",
			"COUNT(*) AS total",
			"SUM(CASE WHEN JSON_EXTRACT(content, '$.data.statusCode') LIKE '2%' THEN 1 ELSE 0 END) AS count_200",
			"SUM(CASE WHEN JSON_EXTRACT(content, '$.data.statusCode') LIKE '4%' THEN 1 ELSE 0 END) AS count_400",
			"SUM(CASE WHEN JSON_EXTRACT(content, '$.data.statusCode') LIKE '5%' THEN 1 ELSE 0 END) AS count_500",
			"CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
			"CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
			"CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
			this.getP95SQL("http"),
		];

		const whereClause = `
      WHERE type = 'http' 
      AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) != '0'
      ${periodSql} ${querySql} ${keySql}
    `;

		return {
			items: `
        SELECT ${columns.join(", ")}
        FROM observatory_entries
        ${whereClause}
        GROUP BY route
        ORDER BY total DESC
        LIMIT ${limit} OFFSET ${offset};`,
			count: `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.origin'))) as total FROM observatory_entries ${whereClause};`,
		};
	}

	/**
	 * Logic for the HTTP Graph (Aggregates + Rows)
	 */
	public getIndexGraphDataSQL(filters: HTTPClientFilters) {
		const { period, key } = filters;
		const periodSql = this.getPeriodSQL(period);
		const keySql = key ? this.getInclusionSQL(key, "data.origin") : "";

		const aggregateColumns = [
			"COUNT(*) as total",
			"MIN(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL)) as shortest",
			"MAX(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL)) as longest",
			"AVG(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL)) as average",
			"SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) LIKE '2%' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) LIKE '3%' THEN 1 ELSE 0 END) as count_200",
			"SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) LIKE '4%' THEN 1 ELSE 0 END) as count_400",
			"SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) LIKE '5%' THEN 1 ELSE 0 END) as count_500",
			this.getP95SQL("http"),
			"NULL as created_at",
			"NULL as content",
			"'aggregate' as type",
		];

		const rowColumns = [
			"NULL as total",
			"NULL as shortest",
			"NULL as longest",
			"NULL as average",
			"NULL as count_200",
			"NULL as count_400",
			"NULL as count_500",
			"NULL as p95",
			"created_at",
			"content",
			"'row' as type",
		];

		const commonFilter = `
      WHERE type = 'http' 
      AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) != '0'
      ${periodSql} ${keySql}
    `;

		return `
      (SELECT ${aggregateColumns.join(", ")} FROM observatory_entries ${commonFilter})
      UNION ALL
      (SELECT ${rowColumns.join(", ")} FROM observatory_entries ${commonFilter} ORDER BY created_at DESC);
    `;
	}
}

export default HTTPClientWatcherSQL;
