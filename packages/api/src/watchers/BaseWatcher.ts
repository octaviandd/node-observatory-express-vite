import { Request, Response } from "express";
import Watcher from "./Watcher";
import { v4 as uuidv4 } from "uuid";
import {
  requestLocalStorage,
  jobLocalStorage,
  scheduleLocalStorage,
} from "../patchers/cjs/store";
import { PERIODS } from "../helpers/constants";
import { groupItemsByType, formatValue, sanitizeContent } from "../helpers/helpers";
import Database from "src/database-sql";
import { RedisClientType } from "redis";

export abstract class BaseWatcher implements Watcher {
  readonly type: string;
  protected redisClient: RedisClientType;
  protected DBInstance: Database;
  protected streamKey: string;
  protected consumerGroup: string;
  protected consumerName: string;
  protected isMigrating: boolean = false;
  protected refreshInterval?: NodeJS.Timeout;
  protected refreshIntervalDuration: number = 5000;

  constructor(redisClient: RedisClientType,DBInstance: Database) {
    this.redisClient = redisClient;
    this.DBInstance = DBInstance;

    this.streamKey = `observatory:stream:${this.type}`;
    this.consumerGroup = `observatory:group:${this.type}`;
    this.consumerName = `consumer:${process.pid}:${Date.now()}`;

    this.initializeStream();
    this.migrateToDatabase();
  }

  private async initializeStream() {
    try {
      await this.redisClient.xGroupCreate(this.streamKey, this.consumerGroup, '0', {
        MKSTREAM: true
      });
      console.log(`Created consumer group for ${this.type}`);
    } catch (error: any) {
      if (!error.message?.includes('BUSYGROUP')) {
        console.error(`Error creating consumer group for ${this.type}:`, error);
      }
    }
  }

  async addContent(content: WatcherEntry): Promise<void> {
    try {
      await this.redisClient.xAdd(
        this.streamKey,
        '*',
        {
          uuid: content.uuid,
          request_id: content.requestId || 'null',
          job_id: content.jobId || 'null',
          schedule_id: content.scheduleId || 'null',
          type: content.type,
          content: JSON.stringify(content.content),
          created_at: new Date(content.created_at).getTime().toString()
        }
      );
    } catch (error) {
      console.error(`Error adding to stream ${this.type}:`, error);
      throw error;
    }
  }
  

  async getIndex(req: Request, res: Response): Promise<{body?: any, statusCode: number}> {
    try {
      const filters = this.extractFiltersFromRequest(req);
      const data = await this.handleIndexTableOrGraph(filters);
  
      return { body: data, statusCode: 200 }
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

      try {
        const messages = await this.redisClient.xReadGroup(
          this.consumerGroup,
          this.consumerName,
          [
            {
              key: this.streamKey,
              id: '>' // Only new messages
            }
          ],
          {
            COUNT: 500,
            BLOCK: 1000 // Block for 1 second
          }
        );

        if (!messages || messages.length === 0) {
          this.isMigrating = false;
          return;
        }

        const parsedValues: any[] = [];
        const messageIds: string[] = [];

        for (const stream of messages) {
          for (const message of stream.messages) {
            try {
              const data = message.message;
              
              const parsedEntry: Record<string, any> = {
                uuid: data.uuid,
                type: data.type,
                content: typeof data.content === 'string' ? JSON.parse(data.content) : data.content,
                created_at: new Date(parseInt(data.created_at)).toISOString().replace('T', ' ').substring(0, 19),
                request_id: data.reqest_id,
                job_id: data.job_id,
                schedule_id: data.schedule_id
              };

              parsedValues.push(parsedEntry);
              messageIds.push(message.id);
            } catch (error) {
              console.error(`Error parsing stream message ${message.id}:`, error);
            }
          }
        }

        if (parsedValues.length > 0) {
          try {
            await this.DBInstance.addRedisEntries(parsedValues);

            // Acknowledge messages (mark as processed)
            await this.redisClient.xAck(
              this.streamKey,
              this.consumerGroup,
              messageIds
            );

            await this.redisClient.xTrim(this.streamKey, 'MAXLEN', 1000, {strategyModifier: "~"});

            console.log(`Migrated ${parsedValues.length} ${this.type} entries to database`);
          } catch (dbError) {
            console.error(`Error inserting batch data for ${this.type}:`, dbError);
            // Don't ACK if DB insert failed - messages will be retried
          }
        }
      } catch (error) {
        console.error(`Error in Redis stream migration for ${this.type}:`, error);
      } finally {
        this.isMigrating = false;
      }
    }, this.refreshIntervalDuration);
  }

  async processPendingMessages() {
    try {
      const pending = await this.redisClient.xPendingRange(
        this.streamKey,
        this.consumerGroup,
        '-',    // start
        '+',    // end
        100     // count
      );

      if (!pending || !Array.isArray(pending) || pending.length === 0) {
        return;
      }

      const messageIds = pending.map((msg: any) => msg.id);

      // Claim these messages
      const claimed = await this.redisClient.xClaim(
        this.streamKey,
        this.consumerGroup,
        this.consumerName,
        60000, // Min idle time: 60 seconds
        messageIds
      );

      if (claimed && claimed.length > 0) {
        const parsedValues: any[] = [];
        const claimedIds: string[] = [];

        for (const message of claimed) {
          if (!message?.message) continue;

          try {
            const data = message.message;
            
            const parsedEntry: { [key: string]: any } = {
              uuid: data.uuid,
              type: data.type,
              content: typeof data.content === 'string' ? JSON.parse(data.content) : data.content,
              created_at: new Date(parseInt(data.created_at)).toISOString().replace('T', ' ').substring(0, 19),
              request_id: data.request_id,
              job_id: data.job_id,
              schedule_id: data.schedule_id
            };

            parsedValues.push(parsedEntry);
            claimedIds.push(message.id);
          } catch (error) {
            console.error(`Error parsing claimed message:`, error);
          }
        }

        if (parsedValues.length > 0) {
          await this.DBInstance.addRedisEntries(parsedValues);
          await this.redisClient.xAck(this.streamKey, this.consumerGroup, claimedIds);
        }
      }
    } catch (error) {
      console.error(`Error processing pending messages for ${this.type}:`, error);
    }
  }

  async cleanup() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    await this.processPendingMessages();
  }

  /**
   * Data Access Methods
   * --------------------------------------------------------------------------
   */
  async handleAdd(entry: WatcherEntry): Promise<void> {
   await this.DBInstance.insert(entry)
  }

  async handleView(id: string): Promise<any> {
    return this.handleViewSQL(id);
  }

  async getAllEntries(): Promise<any> {
    return this.getAllEntriesSQL();
  }

  protected async getAllEntriesSQL(): Promise<any> {
    this.DBInstance.getAllEntriesByType(this.type)
  }

  protected handleRelatedData(
    modelId: string,
    requestId: string,
    jobId: string,
    scheduleId: string,
  ): Promise<any> {
    return this.handleRelatedDataSQL(modelId, requestId, jobId, scheduleId);
  }

  // public setRefreshIntervalDuration = (interval: number) => {
  //   if (this.refreshInterval) {
  //     clearInterval(this.refreshInterval);
  //     this.refreshInterval = undefined;
  //   }
  //   this.refreshIntervalDuration = interval;
  //   this.migrateToDatabase();
  // };

  protected durationGraphData(data: any, period: string) {
    const totalDuration = this.periods[period].duration;
    const slotsCount = 120; // how many time slots (bars) we want
    const intervalDuration = totalDuration / slotsCount;

    const now = Date.now();
    const startDate = now - totalDuration * 60 * 1000;

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

    groupedData.forEach((slot) => {
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
    const totalDuration = this.periods[period].duration;
    const intervalDuration = totalDuration / 120; // Duration of each bar in minutes

    let timeAgo = 0;
    let config = {};

    switch (period) {
      case '1h':
        timeAgo = new Date().getTime() - 60 * 60 * 1000;
        config = { minute: "2-digit", second: "2-digit" }
        break;
      case '24h':
        timeAgo = new Date().getTime() - 24 * 60 * 60 * 1000;
        config = { minute: "2-digit", second: "2-digit" }
        break
      case '7d':
        timeAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
        config = { minute: "2-digit", second: "2-digit", weekday: 'short' }
        break
      case '14d':
        timeAgo = new Date().getTime() - 14 * 24 * 60 * 60 * 1000;
        config = { minute: "2-digit", second: "2-digit", weekday: 'short' }
        break
      case '30d':
        timeAgo = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
        config = { minute: "2-digit", second: "2-digit", weekday: 'short' }
        break
      default:
        break
    }

    const interval = timeAgo + index * intervalDuration * 60 * 1000;
    const startTime = new Date(interval).toLocaleTimeString("en-US", config);
    const endTime = new Date(interval + intervalDuration * 60 * 1000).toLocaleTimeString("en-US", config);
    return `${startTime} - ${endTime}`
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
   * Abstract Methods
   * --------------------------------------------------------------------------
   */
  protected abstract countGraphData(data: any, period: string): any;
  protected abstract extractFiltersFromRequest(req: Request): WatcherFilters;

  protected abstract handleRelatedDataSQL(modelId: string, requestId: string, jobId: string, scheduleId: string): Promise<any>;

  protected abstract getIndexGraphDataSQL(filters: WatcherFilters): Promise<any>;
  protected abstract getIndexTableDataByGroupSQL(filters: WatcherFilters): Promise<any>;
  protected abstract getIndexTableDataByInstanceSQL(filters: WatcherFilters): Promise<any>;

  protected abstract handleViewSQL(id: string): Promise<any>;
}
