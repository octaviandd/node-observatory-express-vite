import { PERIODS } from "../../helpers/constants.js";

export abstract class BaseBuilder {
  getPeriodSQL = (period: string): string => period ? `AND created_at >= UTC_TIMESTAMP() - ${PERIODS[period].interval}` : '';
  
  getEqualitySQL = (value: string, type: string): string => 
    value ? `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.${type}')) = '${value}'` : '';

  getP95SQL(watcherType: string): string {
    if (['exception', 'log'].includes(watcherType)) return 'NULL as p95';
    return `CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(GROUP_CONCAT(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2)) ORDER BY CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2)) SEPARATOR ','), ',', CEILING(COUNT(*) * 0.95)), ',', -1) AS DECIMAL(10,2)) AS p95`;
  }

  getInclusionSQL = (value: string, type: string): string => value ? `AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(content, '$.${type}'))) LIKE '%${value.toLowerCase()}%'` : "";

  abstract getIndexTableDataByInstanceSQL(filters: any): { items: string; count: string };
  abstract getIndexTableDataByGroupSQL(filters: any): { items: string; count: string };
  abstract getIndexGraphDataSQL(filters: any): string;
}