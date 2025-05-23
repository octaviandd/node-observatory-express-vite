import { Request, Response } from "express";
import { StoreDriver } from "../../types";
import Watcher, { WatcherEntry, WatcherFilters } from "./Watcher";
import { v4 as uuidv4 } from "uuid";
import {
  requestLocalStorage,
  jobLocalStorage,
  scheduleLocalStorage,
} from "../patchers/store";
import { Connection as PromiseConnection } from "mysql2/promise";

export abstract class BaseWatcher implements Watcher {
  protected readonly storeDriver: StoreDriver;
  protected storeConnection: any;
  protected redisClient: any;
  protected serverAdapter: any;
  protected isMigrating: boolean = false;
  abstract readonly type: string;
  refreshInterval: NodeJS.Timeout | undefined;
  refreshIntervalDuration: number;
  /**
   * Constants
   * --------------------------------------------------------------------------
   */
  protected readonly periods = {
    "1h": 60,
    "24h": 24 * 60,
    "7d": 7 * 24 * 60,
    "14d": 14 * 24 * 60,
    "30d": 30 * 24 * 60,
  } as const;

  protected readonly timeMap = {
    "1h": "INTERVAL 1 HOUR",
    "24h": "INTERVAL 1 DAY",
    "7d": "INTERVAL 7 DAY",
    "14d": "INTERVAL 14 DAY",
    "30d": "INTERVAL 30 DAY",
  } as const;

  /**
   * Constructor & Initialization
   * --------------------------------------------------------------------------
   */
  constructor(
    storeDriver: StoreDriver,
    storeConnection: PromiseConnection,
    redisClient: any,
    serverAdapter: any
  ) {
    this.storeDriver = storeDriver;
    this.redisClient = redisClient ? redisClient : null;
    this.refreshInterval;
    this.refreshIntervalDuration = 10000;
    this.storeConnection = storeConnection;
    this.serverAdapter = serverAdapter;
    this.migrateToDatabase();
  }

  /**
   * Public API Methods
   * --------------------------------------------------------------------------
   */
  async getIndex(req: Request, res: Response): Promise<{body?: any, statusCode: number}> {
    try {
      const filters = this.extractFiltersFromRequest(req);
      const data = await this.handleIndexTableOrGraph(filters);
      return {
        body: data,
        statusCode: 200
      }
    } catch (error) {
      console.error(error);
      return {
        statusCode: 500
      }
    }
  }

  async getView(req: Request, res: Response): Promise<{body?: any, statusCode: number}> {
    try {
      const id = req.params.id;
      const data = await this.handleView(id);
      return {
        body: data,
        statusCode: 200
      }
    } catch (error) {
      console.error(error);
      return {
        statusCode: 500
      }
    }
  }

  async getRelatedData(req: Request, res: Response): Promise<{body?: any, statusCode: number}> {
    try {
      const modelId = req.params.id;
      const { requestId, jobId, scheduleId } = req.body;
      const data = await this.handleRelatedData(
        modelId,
        requestId,
        jobId,
        scheduleId,
      );
      
      return {
        body: data, 
        statusCode: 200
      }
    } catch (error) {
      console.error(error);
      return {
        statusCode: 500
      }
    }
  }

  async addContent(content: { [key: string]: any }): Promise<void> {
    const entry: WatcherEntry = {
      uuid: uuidv4(),
      type: this.type,
      content: JSON.stringify(
        this.type === "request" || this.type === "http"
          ? this.sanitizeContent(content)
          : content,
      ),
      created_at: Date.now(),
    };

    if (requestLocalStorage.getStore()?.get("requestId")) {
      entry.requestId = requestLocalStorage.getStore()?.get("requestId");
    }

    if (jobLocalStorage.getStore()?.get("jobId")) {
      entry.jobId = jobLocalStorage.getStore()?.get("jobId");
    }

    if (scheduleLocalStorage.getStore()?.get("scheduleId")) {
      entry.scheduleId = scheduleLocalStorage.getStore()?.get("scheduleId");
    }

    try {
      await this.redisMiddleware(entry);
    } catch (error) {
      console.error(`Error in ${this.type} addContent:`, error);
      throw error;
    }
  }

  protected async redisMiddleware(entry: any): Promise<any> {
    if (!this.redisClient) {
      await this.handleAdd(entry);
      return;
    }

    const key = `observatory_entries:${this.type}:${entry.uuid}:${entry.requestId ?? "null"}:${entry.jobId ?? "null"}:${entry.scheduleId ?? "null"}:${entry.created_at}`;

    delete entry.uuid;
    delete entry.requestId;
    delete entry.jobId;
    delete entry.scheduleId;
    delete entry.created_at;
    delete entry.type;

    try {
      await this.redisClient.set(key, JSON.stringify(entry.content));
    } catch (error) {
      console.error(`Error setting Redis key: ${key}`, error);
      throw error;
    }
  }

  protected async refreshData(req: Request, res: Response): Promise<Response> {
    try {
      this.refreshInterval && clearInterval(this.refreshInterval);
      this.migrateToDatabase();
      return res.status(200).json({ message: "Data refreshed" });
    } catch (error) {
      return res.status(500).json({ error });
    }
  }

  protected async migrateToDatabase() {
    this.refreshInterval = setInterval(async () => {
      if (this.isMigrating) {
        return;
      }

      this.isMigrating = true;
      let cursor = "0";

      const allKeys = [];
      const pattern = `observatory_entries:${this.type}:*`;
      const scanCount = 500;

      try {
        do {
          const reply = await this.redisClient.scan(cursor, {
            MATCH: pattern,
            COUNT: scanCount,
          });

          cursor = reply.cursor.toString();
          const keysInBatch = reply.keys;

          if (keysInBatch.length > 0) {
            allKeys.push(...keysInBatch);
          }
        } while (cursor !== "0");

        if (!allKeys || !allKeys.length) {
          this.isMigrating = false;
          return;
        }

        const parsedValues: any[] = [];

        const values = await this.redisClient.mGet(allKeys);
        const keyValuePairs = allKeys.map((key: any, index: any) => ({
          key: key,
          value: values[index],
        }));

        const validKeyValuePairs = keyValuePairs.filter(
          (kv) => kv.value !== null,
        );

        validKeyValuePairs.forEach(
          ({ key, value }: { key: any; value: any }) => {
            try {
              const timestamp = key.split(":").pop();
              const date = new Date(parseInt(timestamp));
              const formattedDate = date
                .toISOString()
                .replace("T", " ")
                .substring(0, 19);

              const keySegments = key.split(":");
              const parsedEntry: { [key: string]: any } = {
                type: keySegments[1],
                uuid: keySegments[2],
                content: typeof value === "string" ? JSON.parse(value) : value,
                created_at: formattedDate,
              };

              const requestIdSegment = keySegments[3];
              const jobIdSegment = keySegments[4];
              const scheduleIdSegment = keySegments[5];

              const hasRequestId = requestIdSegment !== "null" ? true : false;
              const hasJobId = jobIdSegment !== "null" ? true : false;
              const hasScheduleId = scheduleIdSegment !== "null" ? true : false;

              if (hasRequestId) parsedEntry.request_id = requestIdSegment;
              if (hasJobId) parsedEntry.job_id = jobIdSegment;
              if (hasScheduleId) parsedEntry.schedule_id = scheduleIdSegment;

              parsedValues.push(parsedEntry);
            } catch (error) {
              console.error(`Error parsing value for key ${key}:`, error);
            }
          },
        );

        if (parsedValues.length > 0) {
          try {
            switch (this.storeDriver) {
              case "mysql2":
                try {
                  await this.storeConnection.query("START TRANSACTION");
                  await this.storeConnection.query(
                    "INSERT INTO observatory_entries (uuid, request_id, job_id, schedule_id, type, content, created_at) VALUES ?",
                    [
                      parsedValues.map((entry) => [
                        entry.uuid,
                        entry.request_id,
                        entry.job_id,
                        entry.schedule_id,
                        entry.type,
                        entry.content,
                        entry.created_at,
                      ]),
                    ],
                  );
                  await this.storeConnection.query("COMMIT");
                } catch (error) {
                  console.error(
                    "Error inserting batch data:",
                    error,
                    this.type,
                  );
                }
                break;
            }
            await this.redisClient.del(allKeys);
          } catch (dbError) {
            console.error("Error inserting batch data:", dbError, this.type);
          }
        }
      } catch (scanError) {
        console.error("Error in Redis watcher", scanError);
      } finally {
        this.isMigrating = false;
      }
    }, this.refreshIntervalDuration);
  }

  /**
   * Data Access Methods
   * --------------------------------------------------------------------------
   */
  async handleAdd(entry: WatcherEntry): Promise<void> {
    try {
      switch (this.storeDriver) {
        case "mysql2":
          await this.handleAddSQL(entry);
          break;
        default:
          throw new Error(`Unsupported store driver: ${this.storeDriver}`);
      }
    } catch (error) {
      console.error(`Error in ${this.type} handleAdd:`, error);
      throw error;
    }
  }

  async handleView(id: string): Promise<any> {
    switch (this.storeDriver) {
      case "mysql2":
        return this.handleViewSQL(id);
      default:
        throw new Error(`Unsupported store driver: ${this.storeDriver}`);
    }
  }

  async getAllEntries(): Promise<any> {
    switch (this.storeDriver) {
      case "mysql2":
        return this.getAllEntriesSQL();
      default:
        throw new Error(`Unsupported store driver: ${this.storeDriver}`);
    }
  }

  protected async getAllEntriesSQL(): Promise<any> {
    const [results] = await this.storeConnection.query(
      "SELECT * FROM observatory_entries WHERE type = ?",
      [this.type],
    );
    return results;
  }

  protected handleRelatedData(
    modelId: string,
    requestId: string,
    jobId: string,
    scheduleId: string,
  ): Promise<any> {
    switch (this.storeDriver) {
      case "mysql2":
        return this.handleRelatedDataSQL(modelId, requestId, jobId, scheduleId);
      default:
        throw new Error(`Unsupported store driver: ${this.storeDriver}`);
    }
  }

  /**
   * Protected Database Implementation Methods
   * --------------------------------------------------------------------------
   */
  protected async handleAddSQL(entry: WatcherEntry): Promise<void> {
    await this.storeConnection.query(
      "INSERT INTO observatory_entries (uuid, request_id, job_id, schedule_id, type, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        entry.uuid,
        entry.requestId,
        entry.jobId,
        entry.scheduleId,
        entry.type,
        entry.content,
        new Date(),
      ],
    );
  }

  /**
   * Protected Helper Methods
   * --------------------------------------------------------------------------
   */
  protected getPeriodSQL = (period: string) => {
    return `AND created_at >= UTC_TIMESTAMP() - ${this.timeMap[period as keyof typeof this.timeMap]}`;
  };

  protected getEqualitySQL = (value: string, type: string) => {
    return `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.${type}')) = '${value}'`;
  };

  protected getInclusionSQL = (value: string, type: string) => {
    return `AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(content, '$.${type}'))) LIKE '%${value.toLowerCase()}%'`;
  };

  public setRefreshIntervalDuration = (interval: number) => {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
    this.refreshIntervalDuration = interval;
    this.migrateToDatabase();
  };

  protected formatValue = (value: string | number | null, isCount = false) => {
    if (!value) return "0" + (isCount ? "" : "ms");
    const num = Number(value);
    if (num > 999) {
      return `${(num / 1000).toFixed(2)}${isCount ? "K" : "s"}`;
    }
    return `${num}${isCount ? "" : "ms"}`;
  };

  protected groupItemsByType(items: any): { [key: string]: any[] } {
    return items.reduce((acc: { [key: string]: any[] }, item: any) => {
      const type = item.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(item);
      return acc;
    }, {});
  }

  private sanitizeContent<T>(content: T): T {
    const seen = new WeakSet();

    const sanitize = (obj: any): any => {
      // Handle non-object types
      if (obj === null || typeof obj !== "object") {
        return obj;
      }

      // Handle Date objects
      if (obj instanceof Date) {
        return obj.toISOString();
      }

      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map((item) => sanitize(item));
      }

      // Detect circular reference
      if (seen.has(obj)) {
        return "[Circular Reference]";
      }

      // Add object to seen set
      seen.add(obj);

      // Create new object to hold sanitized values
      const sanitized: { [key: string]: any } = {};

      // Process each property
      for (const [key, value] of Object.entries(obj)) {
        try {
          // Skip functions
          if (typeof value === "function") {
            continue;
          }
          // Recursively sanitize value
          sanitized[key] = sanitize(value);
        } catch (error: any) {
          // If any error occurs while processing a property, replace with error message
          sanitized[key] = `[Error: ${error.message}]`;
        }
      }

      return sanitized;
    };

    // Start sanitization from the root object
    return sanitize(content);
  }

  protected durationGraphData(data: any, period: string) {
    const totalDuration = this.periods[period as keyof typeof this.periods]; // in minutes
    const slotsCount = 120; // how many time slots (bars) we want
    const intervalDuration = totalDuration / slotsCount; // each slot in minutes

    const now = Date.now(); // current timestamp (ms)
    const startDate = now - totalDuration * 60 * 1000; // start time (ms)

    const groupedData = Array.from({ length: slotsCount }, (_, index) => ({
      durations: [] as number[],
      avgDuration: 0,
      p95: 0,
      count: 0,
      label: this.getLabel(index, period),
    }));

    data.forEach((request: any) => {
      const requestTime = new Date(request.created_at).getTime();
      const duration = parseFloat(request.content.duration); // assume it's in ms

      // Figure out which interval slot this request belongs to
      const intervalIndex = Math.floor(
        (requestTime - startDate) / (intervalDuration * 60 * 1000),
      );

      if (intervalIndex >= 0 && intervalIndex < slotsCount) {
        groupedData[intervalIndex].durations.push(duration);
      }
    });

    groupedData.forEach((slot, index) => {
      const len = slot.durations.length;
      if (len > 0) {
        slot.durations.sort((a, b) => a - b);
        slot.count = len;

        const sum = slot.durations.reduce((acc, val) => acc + val, 0);
        slot.avgDuration = parseFloat((sum / len).toFixed(2));

        const p95Index = Math.floor(0.95 * len);
        slot.p95 = slot.durations[p95Index];
      }
    });

    return groupedData;
  }

  protected getLabel(index: number, period: string) {
    const totalDuration = this.periods[period as keyof typeof this.periods]; // Total duration in minutes
    const intervalDuration = totalDuration / 120; // Duration of each bar in minutes

    if (period === "1h") {
      let oneHourAgo = new Date().getTime() - 60 * 60 * 1000;
      let interval = oneHourAgo + index * intervalDuration * 60 * 1000;
      let label =
        new Date(interval).toLocaleTimeString("en-US", {
          minute: "2-digit",
          second: "2-digit",
        }) +
        " - " +
        new Date(interval + intervalDuration * 60 * 1000).toLocaleTimeString(
          "en-US",
          { minute: "2-digit", second: "2-digit" },
        );
      return label;
    }

    if (period === "24h") {
      let oneDayAgo = new Date().getTime() - 24 * 60 * 60 * 1000;
      let interval = oneDayAgo + index * intervalDuration * 60 * 1000;
      let label =
        new Date(interval).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }) +
        " - " +
        new Date(interval + intervalDuration * 60 * 1000).toLocaleTimeString(
          "en-US",
          { hour: "2-digit", minute: "2-digit" },
        );
      return label;
    }

    if (period === "7d") {
      let oneWeekAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
      let interval = oneWeekAgo + index * intervalDuration * 60 * 1000;
      let label =
        new Date(interval).toLocaleTimeString("en-US", {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        }) +
        " - " +
        new Date(interval + intervalDuration * 60 * 1000).toLocaleTimeString(
          "en-US",
          { weekday: "short", hour: "2-digit", minute: "2-digit" },
        );
      return label;
    }

    if (period === "14d") {
      let twoWeeksAgo = new Date().getTime() - 14 * 24 * 60 * 60 * 1000;
      let interval = twoWeeksAgo + index * intervalDuration * 60 * 1000;
      let label =
        new Date(interval).toLocaleTimeString("en-US", {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        }) +
        " - " +
        new Date(interval + intervalDuration * 60 * 1000).toLocaleTimeString(
          "en-US",
          { weekday: "short", hour: "2-digit", minute: "2-digit" },
        );
      return label;
    }

    if (period === "30d") {
      let oneMonthAgo = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
      let interval = oneMonthAgo + index * intervalDuration * 60 * 1000;
      let label =
        new Date(interval).toLocaleTimeString("en-US", {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        }) +
        " - " +
        new Date(interval + intervalDuration * 60 * 1000).toLocaleTimeString(
          "en-US",
          { weekday: "short", hour: "2-digit", minute: "2-digit" },
        );
      return label;
    }
  }

  /**
   * Index Methods
   * --------------------------------------------------------------------------
   */

  handleIndexTableOrGraph(filters: WatcherFilters) {
    if (filters.isTable) {
      return this.handleIndexTableByInstanceOrGroup(filters);
    } else {
      const handler: Record<
        StoreDriver,
        (filters: WatcherFilters) => Promise<any>
      > = {
        mysql2: this.getIndexGraphDataSQL,
      };
      return handler[this.storeDriver].call(this, filters);
    }
  }

  handleIndexTableByInstanceOrGroup(filters: WatcherFilters) {
    const handler: Record<
      StoreDriver,
      (filters: WatcherFilters) => Promise<any>
    > =
      filters.index === "instance"
        ? {
            mysql2: this.getIndexTableDataByInstanceSQL,
          }
        : {
            mysql2: this.getIndexTableDataByGroupSQL,
          };

    return handler[this.storeDriver].call(this, filters);
  }

  /**
   * Abstract Methods To Be Implemented
   * --------------------------------------------------------------------------
   */
  protected abstract countGraphData(data: any, period: string): any;
  protected abstract extractFiltersFromRequest(req: Request): WatcherFilters;

  protected abstract handleRelatedDataSQL(
    modelId: string,
    requestId: string,
    jobId: string,
    scheduleId: string,
  ): Promise<any>;

  protected abstract getIndexGraphDataSQL(
    filters: WatcherFilters,
  ): Promise<any>;

  protected abstract getIndexTableDataByGroupSQL(
    filters: WatcherFilters,
  ): Promise<any>;

  protected abstract getIndexTableDataByInstanceSQL(
    filters: WatcherFilters,
  ): Promise<any>;

  protected abstract handleViewSQL(id: string): Promise<any>;
}
