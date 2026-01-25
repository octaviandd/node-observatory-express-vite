// /** @format */
// import { Request } from "express";
// import { BaseWatcher } from "./BaseWatcher.js";
// import Database from '../databases/sql/Base.js';
// import { RedisClientType } from "redis";
// import { formatValue, groupItemsByType } from "../helpers/helpers.js";

// class ScheduleWatcher extends BaseWatcher {
//   readonly type = "schedule";

//   constructor(redisClient: RedisClientType, DBInstance: Database) {
//     super(redisClient, DBInstance, "schedule");
//   }

//   protected async getTableData(filters: ScheduleFilters): Promise<{ results: any, count: string }> {
//     if (filters.index === 'instance') {
//       const results = await this.DBInstance.getByInstance(filters, this.type);
//       const total = await this.DBInstance.getByInstanceCount(filters, this.type, '');

//       return { results, count: formatValue(total, true) };
//     } else {
//       const results = await this.DBInstance.getByGroup(filters, this.type);
//       const total = await this.DBInstance.getByGroupCount(filters, this.type, '');

//       return { results, count: formatValue(total, true) };
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

//     // Schedule uses all three IDs together to find related entries
//     const conditions = [
//       ...(hasRequestId ? ["request_id = ?"] : []),
//       ...(hasJobId ? ["job_id = ?"] : []),
//       ...(hasScheduleId ? ["schedule_id = ?"] : [])
//     ];
//     const params = [
//       ...(hasRequestId ? [entry.request_id!] : []),
//       ...(hasJobId ? [entry.job_id!] : []),
//       ...(hasScheduleId ? [entry.schedule_id!] : [])
//     ];

//     const relatedEntries = await this.DBInstance.getRelatedViewdata(conditions, params, this.type, '');
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
//       ...(jobId ? [jobId] : []),
//       ...(scheduleId ? [scheduleId] : [])
//     ];

//     const results = await this.DBInstance.getRelatedViewdata(conditions, params, this.type, '');
//     return groupItemsByType(results);
//   }

//   protected async getGraphData(filters: ScheduleFilters): Promise<any> {
//     return await this.DBInstance.getGraphData(
//       filters,
//       this.type,
//       ['completed', 'failed'],
//       true // schedule has duration
//     );
//   }

//   protected extractFiltersFromRequest(req: ObservatoryBoardRequest): ScheduleFilters {
//     return {
//       period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
//       offset: parseInt(req.query.offset as string, 10) || 0,
//       limit: parseInt(req.query.limit as string, 10) || 20,
//       query: req.query.q as string,
//       isTable: req.query.table === "true",
//       groupFilter: req.query.groupFilter as "all" | "errors" | "slow",
//       index: req.query.index as "instance" | "group",
//       key: req.query.key as string,
//       status: req.query.status as "all" | "completed" | "failed",
//     };
//   }
// }

// export default ScheduleWatcher;