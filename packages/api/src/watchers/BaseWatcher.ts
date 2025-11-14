import { Request } from "express";
import Watcher from "./Watcher";
import {
  requestLocalStorage,
  jobLocalStorage,
  scheduleLocalStorage,
} from "../patchers/cjs/store";
import Database from "src/database-sql";
import { RedisClientType } from "redis";

interface RedisEntry {
  uuid: string
  type: string
  content: Record<string, any>
  created_at: string;
  schedule_id: string;
  job_id: string;
  request_id: string;
}

export abstract class BaseWatcher implements Watcher {
  protected readonly RedisClient: RedisClientType;
  protected readonly DBInstance: Database;
  private streamKey: string;
  private consumerGroup: string;
  private consumerName: string;
  private isMigrating: boolean = false;
  protected refreshInterval?: NodeJS.Timeout;
  protected refreshIntervalDuration: number = 5000;
  readonly type: string;

  constructor(redisClient: RedisClientType, DBInstance: Database) {
    this.RedisClient = redisClient;
    this.DBInstance = DBInstance;

    this.streamKey = `observatory:stream:${this.type}`;
    this.consumerGroup = `observatory:group:${this.type}`;
    this.consumerName = `consumer:${process.pid}:${Date.now()}`;

    this.createRedisStream();
    this.ingestRedisStream();
  }

  private async createRedisStream() {
    try {
      await this.RedisClient.xGroupCreate(this.streamKey, this.consumerGroup, '0', {  MKSTREAM: true });
      console.log(`Created consumer group for ${this.type}`);
    } catch (error: any) {
      if (!error.message?.includes('BUSYGROUP')) {
        console.error(`Error creating consumer group for ${this.type}:`, error);
      }
    }
  }

  private async ingestRedisStream() {
    this.refreshInterval = setInterval(async () => {
      if (this.isMigrating) {
        return;
      }

      this.isMigrating = true;

      try {
        const messages = await this.RedisClient.xReadGroup(
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

        const parsedValues: RedisEntry[] = [];
        const messageIds: string[] = [];

        for (const stream of messages) {
          for (const message of stream.messages) {
            try {
              const data = message.message;
              
              const parsedEntry: RedisEntry = {
                uuid: data.uuid,
                type: data.type,
                content: JSON.parse(data.content),
                created_at: data.created_at,
                request_id: data.request_id,
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
            await this.DBInstance.insert(parsedValues);

            // Acknowledge messages (mark as processed)
            await this.RedisClient.xAck(
              this.streamKey,
              this.consumerGroup,
              messageIds
            );

            await this.RedisClient.xTrim(this.streamKey, 'MAXLEN', 1000, {strategyModifier: "~"});

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

  private async processPendingMessages() {
    try {
      const pending = await this.RedisClient.xPendingRange(
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

      const claimed = await this.RedisClient.xClaim(
        this.streamKey,
        this.consumerGroup,
        this.consumerName,
        60000, // Min idle time: 60 seconds
        messageIds
      );

      if (claimed && claimed.length > 0) {
        const parsedValues: RedisEntry[] = [];
        const claimedIds: string[] = [];

        for (const message of claimed) {
          if (!message?.message) continue;

          try {
            const data = message.message;

            const parsedEntry: RedisEntry = {
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
          await this.DBInstance.insert(parsedValues);
          await this.RedisClient.xAck(this.streamKey, this.consumerGroup, claimedIds);
        }
      }
    } catch (error) {
      console.error(`Error processing pending messages for ${this.type}:`, error);
    }
  }

  private async cleanup() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    await this.processPendingMessages();
  }

  async index(req: Request): Promise<{ body?: any, statusCode: number }> {
    try {
      const filters = this.extractFiltersFromRequest(req);
      const body = await this.DBInstance.getIndexData(filters, this.type);
  
      return { body, statusCode: 200 }
    } catch (error) {
      console.error(error);
      return {
        statusCode: 500,
      }
    }
  }
  

  async view(req: Request): Promise<{ body?: any, statusCode: number }> {
    try {
      const body = await this.getViewdata(req.params.id);

      return { body, statusCode: 200 }
    } catch (error) {
      console.error(error);
      return {
        statusCode: 500
      }
    }
  }

  async metadata(req: Request): Promise<{ body?: any, statusCode: number }> {
    try {
      const data = await this.getMetadata(req.body.entry_ids)
      
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

  async insertRedisStream(content: WatcherEntry): Promise<void> {
    try {
      await this.RedisClient.xAdd(
        this.streamKey,
        '*',
        {
          uuid: content.uuid,
          request_id: requestLocalStorage.getStore()?.get("requestId") || 'null',
          job_id: jobLocalStorage.getStore()?.get("jobId") || 'null',
          schedule_id: scheduleLocalStorage.getStore()?.get("scheduleId") || 'null',
          type: content.type,
          content: JSON.stringify(content.content),
          created_at: new Date(content.created_at).toISOString().replace('T', ' ').substring(0, 19)
        }
      );
    } catch (error) {
      console.error(`Error adding to stream ${this.type}:`, error);
      throw error;
    }
  }

  protected async refresh(req: Request, res: Response): Promise<Response> {
    try {
      this.refreshInterval && clearInterval(this.refreshInterval);
      this.ingestRedisStream();
      return res.status(200).json({ message: "Data refreshed" });
    } catch (error) {
      return res.status(500).json({ error });
    }
  }

  protected updateRefreshInterval = (interval: number): void => {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
    this.refreshIntervalDuration = interval;
    this.ingestRedisStream();
  };

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

  protected abstract getViewdata(id: string): Promise<any>;
  protected abstract getMetadata(id: string): Promise<any>;
}
