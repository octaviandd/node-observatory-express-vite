import Watcher from "./Watcher";
import { requestLocalStorage, jobLocalStorage, scheduleLocalStorage,} from "../store.js";
import Database from "../database-sql.js";
import { RedisClientType } from "redis";
import { RedisError } from "../helpers/errors/Errors";
import { dropUndefinedKeys, sanitizeContent } from "../helpers/helpers";

export abstract class BaseWatcher implements Watcher {
  protected readonly RedisClient: RedisClientType;
  protected readonly DBInstance: Database;
  private streamKey: string;
  private consumerGroup: string;
  private consumerName: string;
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
    this.cleanupPendingOnStartup();
    this.ingestRedisStream();
  }


  private async createRedisStream(): Promise<void | undefined> {
    try {
      await this.RedisClient.xGroupCreate(this.streamKey, this.consumerGroup, '0', {  MKSTREAM: true });
      console.log(`Created consumer group for ${this.type}`);
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes('BUSYGROUP')) return;
      throw new RedisError(`Error creating consumer group for ${this.type}:`, {cause: (error as Error)})
    }
  }

  private async acknowledgeMessages(messageIds: string[]) {
    try {
      const result = await this.RedisClient.xAck(
        this.streamKey,
        this.consumerGroup,
        messageIds
      );
      console.log('after xAck, result:', result);
    } catch (error) {
      console.error(`Error xAck messages for ${this.type}:`, error);
    }
  }

  private async trimStreamKeys() {
    try {
      await this.RedisClient.xTrim(this.streamKey, 'MAXLEN', 1000, { strategyModifier: "~" });
    } catch (error) {
      console.error(`Error trimming data for ${this.type}:`, error);
    }
  }

  private async insertIntoDB(parsedValues: RedisEntry[]): Promise<void> {
    try {
      await this.DBInstance.insert(parsedValues);
      console.log('inserted into db: ',  parsedValues)
    } catch (dbError) {
      console.error(`Error inserting batch data for ${this.type}:`, dbError);
      // Don't ACK if DB insert failed - messages will be retried
    }
  }

  private async extractEntriesFromStream(): Promise<undefined | { parsedValues: RedisEntry[], messageIds: string[] }> {
    try {
      const streams = await this.RedisClient.xReadGroup(
        this.consumerGroup,
        this.consumerName,
        [{
            key: this.streamKey,
            id: '>' // Only new messages
          }
        ],
        {
          COUNT: 500,
          BLOCK: 1000 // Block for 1 second
        }
      );

      if (!streams || streams.length === 0) return;

      const parsedValues: RedisEntry[] = [];
      const messageIds: string[] = [];


      for (const stream of streams) {
        for (const messageObject of stream.messages) {
          const { message } = messageObject;

          const parsedEntry = {
            uuid: `${this.type}:${messageObject.id}`,
            type: message.type,
            content: JSON.parse(message.content),
            created_at: message.created_at,
            request_id: message.request_id,
            job_id: message.job_id,
            schedule_id: message.schedule_id
          };

          parsedValues.push(parsedEntry);
          messageIds.push(messageObject.id);
        }
      }

      return { parsedValues, messageIds };
    } catch (error: unknown) {
      console.error(`Error in Redis stream xReadGroup for ${this.type}:`, error);
    }
  }

  private async ingestRedisStream() {
    const processMessages = async () => {
      try {
        const { parsedValues, messageIds } = await this.extractEntriesFromStream() ?? { parsedValues: [], messageIds: [] };

        if (parsedValues.length > 0) {
          await this.insertIntoDB(parsedValues);
          await this.acknowledgeMessages(messageIds);
          await this.trimStreamKeys();
        }

        console.log('finished one ingest for:', this.streamKey, this.consumerGroup)
      } catch (error) {
        console.error(`Error in Redis stream migration for ${this.type}:`, error);
      } finally {
        this.refreshInterval = setTimeout(processMessages, this.refreshIntervalDuration);
      }
    }

    this.refreshInterval = setTimeout(processMessages, 0);
  }

  private async cleanupPendingOnStartup() {
    try {
      const pending = await this.RedisClient.xPendingRange(
        this.streamKey,
        this.consumerGroup,
        '-',
        '+',
        100  // Check up to 100 pending messages
      );

      if (!pending || pending.length === 0) {
        console.log(`No pending messages for ${this.type}`);
        return;
      }

      const messageIds = pending.map(p => p.id);
      const existingUuids = await this.DBInstance.findExistingUuids(messageIds);

      if (existingUuids.length > 0) {
        await this.RedisClient.xAck(
          this.streamKey,
          this.consumerGroup,
          existingUuids
        );
        console.log(`Cleaned up ${existingUuids.length} already-inserted pending messages for ${this.type}`);
      }
    } catch (error) {
      console.error(`Error cleaning up pending messages for ${this.type}:`, error);
    }
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

      if (!pending || !Array.isArray(pending) || pending.length === 0) return;
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

            const parsedEntry = {
              uuid: `${this.type}:${message.id}`,
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

  async insertRedisStream(content: Record<string, any>): Promise<void> {
    const cleanContent = dropUndefinedKeys(sanitizeContent(content));
    try {
      await this.RedisClient.xAdd(
        this.streamKey,
        '*',
        {
          request_id: requestLocalStorage.getStore()?.get("requestId") || 'null',
          job_id: jobLocalStorage.getStore()?.get("jobId") || 'null',
          schedule_id: scheduleLocalStorage.getStore()?.get("scheduleId") || 'null',
          type: this.type,
          content: JSON.stringify(cleanContent),
          created_at: content.created_at,
        }
      );
    } catch (error) {
      console.error(`Error adding to stream ${this.type}:`, error);
    }
  }

  private async cleanup() {
    // if (this.refreshInterval) clearInterval(this.refreshInterval);
    await this.processPendingMessages();
  }

  async index(req: ObservatoryBoardRequest) {
    const filters = this.extractFiltersFromRequest(req);
    const body = filters.isTable ? await this.getTableData(filters) : await this.getGraphData(filters);
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
  protected abstract getTableData(filters: any): Promise<any>
}
