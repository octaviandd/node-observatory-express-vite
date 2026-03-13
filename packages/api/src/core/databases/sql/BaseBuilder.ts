/** @format */

import { PERIODS } from "../../helpers/constants.js";
export abstract class BaseBuilder {
	/**
	 * Escape single quotes to prevent SQL injection
	 */
	protected escapeSQLString(value: string): string {
		return value.replace(/'/g, "''");
	}

	/**
	 * Validate JSON path to prevent injection
	 */
	protected validateJSONPath(path: string): string {
		// Only allow alphanumeric, dots, and underscores
		if (!/^[a-zA-Z0-9._]+$/.test(path)) {
			throw new Error(`Invalid JSON path: ${path}`);
		}
		return path;
	}

	getPeriodSQL = (period: PeriodValue): string => {
		if (!period) return "";

		// Handle custom period with explicit date range
		if (typeof period === "object" && period.label === "custom") {
			return `AND created_at >= '${period.startDate}' AND created_at <= '${period.endDate}'`;
		}

		// Handle preset periods
		return period ? `AND created_at >= UTC_TIMESTAMP() - ${PERIODS[period as Period].interval}` : "";
	};

	getEqualitySQL = (value: string, type: string): string => {
		if (!value) return "";
		const safePath = this.validateJSONPath(type);
		const safeValue = this.escapeSQLString(value);
		return `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.${safePath}')) = '${safeValue}'`;
	};

	getP95SQL(watcherType: WatcherType): string {
		if (["exception", "log"].includes(watcherType)) return "NULL as p95";
		return `CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(GROUP_CONCAT(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2)) ORDER BY CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2)) SEPARATOR ','), ',', CEILING(COUNT(*) * 0.95)), ',', -1) AS DECIMAL(10,2)) AS p95`;
	}

	getInclusionSQL = (value: string, type: string): string => {
		if (!value) return "";
		const safePath = this.validateJSONPath(type);
		const safeValue = this.escapeSQLString(value);
		return `AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(content, '$.${safePath}'))) LIKE '%${safeValue.toLowerCase()}%'`;
	};

	abstract getIndexTableDataByInstanceSQL(filters: WatcherFilters): { items: string; count: string };
	abstract getIndexTableDataByGroupSQL(filters: WatcherFilters): { items: string; count: string };
	abstract getIndexGraphDataSQL(filters: WatcherFilters): string;
}
