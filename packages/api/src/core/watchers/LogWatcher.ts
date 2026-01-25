// import { Request } from "express";
// import { BaseWatcher } from "./BaseWatcher.js";
// import Database from '../databases/sql/Base.js';
// import { RedisClientType } from "redis";
// import { formatValue, groupItemsByType } from "../helpers/helpers.js";

// class LogWatcher extends BaseWatcher {
//   readonly type = "log";

//   constructor(redisClient: RedisClientType, DBInstance: Database) {
//     super(redisClient, DBInstance, "log");
//   }

//   protected async getTableData(filters: LogFilters): Promise<{ results: any, count: string }> {
//     if (filters.index === 'instance') {
//       const results = await this.DBInstance.getByInstance(filters, this.type);
//       const count = await this.DBInstance.getByInstanceCount(filters, this.type, '');

//       return { results, count: formatValue(count, true) };
//     } else {
//       const results = await this.DBInstance.getByGroup(filters, this.type);
//       const count = await this.DBInstance.getByGroupCount(filters, this.type, '');

//       return { results, count: formatValue(count, true) };
//     }
//   }

//   protected async getViewdata(id: string): Promise<any> {
//     const entry = await this.DBInstance.getEntry(id);

//     const hasRequestId = entry.request_id && entry.request_id !== 'null';
//     const hasScheduleId = entry.schedule_id && entry.schedule_id !== 'null';
//     const hasJobId = entry.job_id && entry.job_id !== 'null';

//     if (!hasRequestId && !hasScheduleId && !hasJobId) {
//       return groupItemsByType([entry]);
//     }

//     const conditions = [
//       ...(hasRequestId ? ["request_id = ?"] : []),
//       ...(hasScheduleId ? ["schedule_id = ?"] : []),
//       ...(hasJobId ? ["job_id = ?"] : [])
//     ];
//     const params = [
//       ...(hasRequestId ? [entry.request_id!] : []),
//       ...(hasScheduleId ? [entry.schedule_id!] : []),
//       ...(hasJobId ? [entry.job_id!] : [])
//     ];

//     const jobCondition = hasJobId
//       ? "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')"
//       : "";

//     const relatedEntries = await this.DBInstance.getRelatedViewdata(conditions, params, this.type, jobCondition);
//     return groupItemsByType(relatedEntries.concat(entry));
//   }

//   protected async getMetadata({ requestId, jobId, scheduleId }: { requestId: string, jobId: string, scheduleId: string }): Promise<any> {
//     if (!requestId && !jobId && !scheduleId) return null;

//     const conditions = [
//       ...(requestId ? [`AND request_id = ?`] : []),
//       ...(jobId ? [`AND job_id = ?`] : []),
//       ...(scheduleId ? [`AND schedule_id = ?`] : [])
//     ];
//     const params = [
//       ...(requestId ? [requestId] : []),
//       ...(scheduleId ? [scheduleId] : []),
//       ...(jobId ? [jobId] : [])
//     ];

//     const jobCondition = jobId
//       ? "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')"
//       : "";

//     const results = await this.DBInstance.getRelatedViewdata(conditions, params, this.type, jobCondition);
//     return groupItemsByType(results);
//   }

//   protected async getGraphData(filters: LogFilters): Promise<any> {
//     return false;
//   }

//   protected extractFiltersFromRequest(req: ObservatoryBoardRequest): LogFilters {
//     return {
//       period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
//       offset: parseInt(req.query.offset as string, 10) || 0,
//       limit: parseInt(req.query.limit as string, 10) || 20,
//       query: req.query.q as string,
//       isTable: req.query.table === "true",
//       logType: req.query.status as LogFilters["logType"],
//       index: req.query.index as "instance" | "group",
//       key: req.query.key as string,
//     };
//   }
// }

// export default LogWatcher;