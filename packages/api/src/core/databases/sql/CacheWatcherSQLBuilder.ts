/** @format */

import { BaseBuilder } from "./BaseBuilder";

class CacheWatcherSQL extends BaseBuilder {
	/**
	 * Helper for cache-specific status filtering
	 */
	private getCacheStatusSQL(type: string | undefined): string {
		if (!type || type === "all") return "";

		const mapping: Record<string, string> = {
			misses: "AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.misses')) > 0",
			hits: "AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.hits')) > 0",
			writes: "AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.writes')) > 0",
		};

		return mapping[type] || "";
	}

	/**
	 * Data for the "Instance" (flat list) view
	 */
	public getIndexTableDataByInstanceSQL(filters: CacheFilters) {
		const { period, limit, offset, query, status, key } = filters;

		const periodSql = this.getPeriodSQL(period);
		const querySql = query ? this.getInclusionSQL(query, "data.key") : "";
		const statusSql = this.getCacheStatusSQL(status);
		const keySql = key ? this.getEqualitySQL(key, "data.key") : "";

		const whereClause = `WHERE type = 'cache' ${periodSql} ${querySql} ${statusSql} ${keySql}`;

		return {
			items: `SELECT * FROM observatory_entries ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};`,
			count: `SELECT COUNT(*) as total FROM observatory_entries ${whereClause};`,
		};
	}

	/**
	 * Data for the "Grouped" (aggregated by key) view
	 */
	public getIndexTableDataByGroupSQL(filters: CacheFilters) {
		const { period, limit, offset, query, key } = filters;

		const periodSql = this.getPeriodSQL(period);
		const querySql = query ? this.getInclusionSQL(query, "data.key") : "";
		const keySql = key ? this.getEqualitySQL(key, "data.key") : "";

		const filterConditions = `WHERE type = 'cache' ${periodSql} ${querySql} ${keySql}`;

		const columns = [
			"JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.key')) as cache_key",
			"COUNT(*) as total",
			"SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.misses')) > 0 THEN 1 ELSE 0 END) as misses",
			"SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.hits')) > 0 THEN 1 ELSE 0 END) as hits",
			"SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.writes')) > 0 THEN 1 ELSE 0 END) as writes",
			"CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
			"CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
			"CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
			this.getP95SQL("cache"),
		];

		return {
			items: `
        SELECT ${columns.join(", ")}
        FROM observatory_entries
        ${filterConditions}
        GROUP BY cache_key
        ORDER BY total DESC
        LIMIT ${limit} OFFSET ${offset};`,
			count: `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.key'))) as total FROM observatory_entries ${filterConditions};`,
		};
	}

	/**
	 * Logic for the Graph (Aggregate + Rows for processing)
	 */
	public getIndexGraphDataSQL(filters: CacheFilters) {
		const { period, key, status } = filters;
		const periodSql = period ? this.getPeriodSQL(period) : "";
		const keySql = key ? this.getEqualitySQL(key, "data.key") : "";
		const statusSql = this.getCacheStatusSQL(status);

		const aggregateColumns = [
			"COUNT(*) as total",
			"COALESCE(SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.hits')) > 0 THEN 1 ELSE 0 END), 0) as hits",
			"COALESCE(SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.writes')) > 0 THEN 1 ELSE 0 END), 0) as writes",
			"COALESCE(SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.misses')) > 0 THEN 1 ELSE 0 END), 0) as misses",
			"CAST(COALESCE(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))), 0) AS DECIMAL(10,2)) as shortest",
			"CAST(COALESCE(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))), 0) AS DECIMAL(10,2)) as longest",
			"CAST(COALESCE(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))), 0) AS DECIMAL(10,2)) as average",
			this.getP95SQL("cache"),
			"NULL as created_at",
			"NULL as content",
			"'aggregate' as type",
		];

		const rowColumns = [
			"NULL as total",
			"NULL as hits",
			"NULL as writes",
			"NULL as misses",
			"NULL as shortest",
			"NULL as longest",
			"NULL as average",
			"NULL as p95",
			"created_at",
			"content",
			"'row' as type",
		];

		const whereClause = `WHERE type = 'cache' ${periodSql} ${keySql} ${statusSql}`;

		return `
      (SELECT ${aggregateColumns.join(", ")} FROM observatory_entries ${whereClause})
      UNION ALL
      (SELECT ${rowColumns.join(", ")} FROM observatory_entries ${whereClause} ORDER BY created_at DESC);
    `;
	}
}

export default CacheWatcherSQL;
