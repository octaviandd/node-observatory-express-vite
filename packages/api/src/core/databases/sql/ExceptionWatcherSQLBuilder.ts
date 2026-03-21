/** @format */

import { BaseBuilder } from "./BaseBuilder";

class ExceptionWatcherSQL extends BaseBuilder {
	/**
	 * Helper for exception-specific status filtering (unhandled vs uncaught)
	 */
	private getExceptionTypeSQL(type: string | undefined): string {
		if (!type || type === "all") return "";

		// Maps the UI filter to the internal JSON property value
		const typeValue = type === "unhandled" ? "unhandledRejection" : "uncaughtException";
		return `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.exceptionType')) = '${typeValue}'`;
	}

	/**
	 * Data for the "Instance" (flat list) view
	 */
	public getIndexTableDataByInstanceSQL(filters: ExceptionFilters) {
		const { period, limit, offset, status, query, key } = filters;

		const periodSql = this.getPeriodSQL(period);
		const typeSql = this.getExceptionTypeSQL(status);
		const querySql = query ? this.getInclusionSQL(query, "data.message") : "";
		const keySql = key ? this.getEqualitySQL(key, "data.message") : "";

		const whereClause = `WHERE type = 'exception' ${periodSql} ${typeSql} ${querySql} ${keySql}`;

		return {
			items: `SELECT * FROM observatory_entries ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};`,
			count: `SELECT COUNT(*) as total FROM observatory_entries ${whereClause};`,
		};
	}

	/**
	 * Data for the "Grouped" (aggregated by message) view
	 */
	public getIndexTableDataByGroupSQL(filters: ExceptionFilters) {
		const { period, limit, offset, query } = filters;

		const periodSql = this.getPeriodSQL(period);
		const querySql = query ? this.getInclusionSQL(query, "message") : "";

		const whereClause = `WHERE type = 'exception' ${periodSql} ${querySql}`;

		const columns = [
			"JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.message')) as header",
			"COUNT(*) as total",
			"MIN(created_at) as first_seen",
			"MAX(created_at) as last_seen",
		];

		return {
			items: `
        SELECT ${columns.join(", ")}
        FROM observatory_entries
        ${whereClause}
        GROUP BY header
        ORDER BY total DESC
        LIMIT ${limit} OFFSET ${offset};`,
			count: `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.data.message'))) as total FROM observatory_entries ${whereClause};`,
		};
	}

	/**
	 * Logic for the Exception Graph (Aggregate Type Counts + Rows)
	 */
	public getIndexGraphDataSQL(filters: ExceptionFilters) {
		const { period, key } = filters;
		const periodSql = this.getPeriodSQL(period);
		const keySql = key ? this.getEqualitySQL(key, "message") : "";

		const aggregateColumns = [
			"COUNT(*) as total",
			"SUM(CASE WHEN JSON_EXTRACT(content, '$.data.exceptionType') = 'unhandledRejection' THEN 1 ELSE 0 END) as unhandledRejection",
			"SUM(CASE WHEN JSON_EXTRACT(content, '$.data.exceptionType') = 'uncaughtException' THEN 1 ELSE 0 END) as uncaughtException",
			"NULL as created_at",
			"NULL as content",
			"'aggregate' as type",
		];

		const rowColumns = [
			"NULL as total",
			"NULL as unhandledRejection",
			"NULL as uncaughtException",
			"created_at",
			"content",
			"'row' as type",
		];

		return `
      (
        SELECT ${aggregateColumns.join(", ")}
        FROM observatory_entries
        WHERE type = 'exception' ${periodSql} ${keySql}
      )
      UNION ALL
      (
        SELECT ${rowColumns.join(", ")}
        FROM observatory_entries
        WHERE type = 'exception' ${periodSql} ${keySql}
        ORDER BY created_at DESC
      );
    `;
	}
}

export default ExceptionWatcherSQL;
