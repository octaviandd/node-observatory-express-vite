import Watcher from "./Watcher";
import { requestLocalStorage, jobLocalStorage, scheduleLocalStorage,} from "../store.js";
import Database from "../database-sql.js";
import { RedisClientType } from "redis";

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

  constructor(redisClient: RedisClientType, DBInstance: Database, type: string) {
    this.RedisClient = redisClient;
    this.DBInstance = DBInstance;
    this.type = type;

    this.streamKey = `observatory:stream:${this.type}`;
    this.consumerGroup = `observatory:group:${this.type}`;
    this.consumerName = `consumer:${process.pid}:${Date.now()}`;

    this.createRedisStream();
    this.ingestRedisStream();

    // process.on('SIGTERM', () => this.cleanup());
    // process.on('SIGINT', () => this.cleanup());
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
          //add created_at in the patcher
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
        }
      );
    } catch (error) {
      console.error(`Error adding to stream ${this.type}:`, error);
      throw error;
    }
  }

  private async cleanup() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    await this.processPendingMessages();
  }

  async index(req: ObservatoryBoardRequest) {
    const filters = this.extractFiltersFromRequest(req);
    const body = await this.DBInstance.getIndexData(filters, this.type);
    return { body, statusCode: 200 }
  }
  

  async view(req: ObservatoryBoardRequest) {
    const body = await this.getViewdata(req.params.id);
    return { body, statusCode: 200 }
  }

  // async metadata(req: Request) {
  //   const data = await this.DBInstance.getRelatedViewdata(req.body.entry_ids)
    
  //   return {
  //     body: data, 
  //     statusCode: 200
  //   }
  // }

  protected async refresh() {
    this.refreshInterval && clearInterval(this.refreshInterval);
    await this.ingestRedisStream();
    return { body: { message: "Interval has been refreshed." }, statusCode: 200 }
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
  protected abstract extractFiltersFromRequest(req: ObservatoryBoardRequest): WatcherFilters;

  protected abstract getViewdata(id: string): Promise<any>;
  protected abstract getMetadata({ requestId, jobId, scheduleId }: { requestId: string, jobId: string, scheduleId: string }): Promise<any>;
  protected abstract getGraphData(filters: any): Promise<any>
}
