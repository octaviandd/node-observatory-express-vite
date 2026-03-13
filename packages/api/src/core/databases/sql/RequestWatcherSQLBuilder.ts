/** @format */

import { BaseBuilder } from "./BaseBuilder";

class RequestWatcherSQL extends BaseBuilder {
	/**
	 * Helper for HTTP status code bucketing (2xx, 4xx, 5xx)
	 */
	private getStatusSQL(type: string | undefined): string {
		if (!type || type === "all") return "";

		if (type === "2xx") {
			return `AND (
        JSON_EXTRACT(content, '$.data.statusCode') LIKE '2%' OR
        JSON_EXTRACT(content, '$.data.statusCode') LIKE '3%'
      )`;
		}

		return `AND JSON_EXTRACT(content, '$.data.statusCode') LIKE '${type[0]}%'`;
	}

	/**
	 * Data for the "Instance" (flat list of requests) view
	 */
	public getIndexTableDataByInstanceSQL(filters: RequestFilters) {
		const { period, query, key, status, offset, limit } = filters;

		const routeSql = key ? this.getEqualitySQL(key, "data.route") : "";
		const querySql = query ? this.getInclusionSQL(query, "data.route") : "";
		const periodSql = this.getPeriodSQL(period);
		const statusSql = this.getStatusSQL(status);

		const whereClause = `
      WHERE type = 'request' 
      AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) != '0'
      ${routeSql} ${querySql} ${periodSql} ${statusSql}
    `;

		return {
			items: `SELECT * FROM observatory_entries ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};`,
			count: `SELECT COUNT(*) AS total FROM observatory_entries ${whereClause};`,
		};
	}

	/**
	 * Data for the "Grouped" (aggregated by route) view
	 */
	public getIndexTableDataByGroupSQL(filters: RequestFilters) {
		const { period, key, query, offset, limit } = filters;

		const routeSQL = key ? this.getEqualitySQL(key, "data.route") : "";
		const timeSQL = period ? this.getPeriodSQL(period) : "";
		const querySQL = query ? this.getInclusionSQL(query, "data.route") : "";

		const columns = [
			"JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.route')) as route",
			"COUNT(*) as total",
			"SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) LIKE '2%' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) LIKE '3%' THEN 1 ELSE 0 END) as count_200",
			"SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) LIKE '4%' THEN 1 ELSE 0 END) as count_400",
			"SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) LIKE '5%' THEN 1 ELSE 0 END) as count_500",
			"CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
			"CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
			"CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
			this.getP95SQL("request"),
		];

		const whereClause = `
      WHERE type = 'request' 
      AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) != '0'
      ${routeSQL} ${timeSQL} ${querySQL}
    `;

		return {
			items: `
        SELECT ${columns.join(", ")}
        FROM observatory_entries
        ${whereClause}
        GROUP BY route
        ORDER BY total DESC
        LIMIT ${limit} OFFSET ${offset};`,
			count: `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.route'))) as total FROM observatory_entries ${whereClause};`,
		};
	}

	/**
	 * Logic for the Request Graph (Aggregates + Chronological Rows)
	 */
	public getIndexGraphDataSQL(filters: RequestFilters) {
		const { period, key, status } = filters;
		const timeSql = period ? this.getPeriodSQL(period) : "";
		const routeSql = key ? this.getEqualitySQL(key, "data.route") : "";
		const statusSql = this.getStatusSQL(status);

		const aggregateColumns = [
			"COUNT(*) as total",
			"CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
			"CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
			"CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
			"SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) LIKE '2%' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) LIKE '3%' THEN 1 ELSE 0 END) as count_200",
			"SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) LIKE '4%' THEN 1 ELSE 0 END) as count_400",
			"SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) LIKE '5%' THEN 1 ELSE 0 END) as count_500",
			this.getP95SQL("request"),
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

		const whereClause = `
      WHERE type = 'request' 
      AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.statusCode')) != '0'
      ${routeSql} ${timeSql} ${statusSql}
    `;

		return `
      (SELECT ${aggregateColumns.join(", ")} FROM observatory_entries ${whereClause})
      UNION ALL
      (SELECT ${rowColumns.join(", ")} FROM observatory_entries ${whereClause} ORDER BY created_at DESC);
    `;
	}
}

export default RequestWatcherSQL;
