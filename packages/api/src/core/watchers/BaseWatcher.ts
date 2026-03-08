/** @format */

import Watcher from "./Watcher";
import {
  requestLocalStorage,
  jobLocalStorage,
  scheduleLocalStorage,
} from "../store.js";
import Database from "../databases/sql/Base.js";
import { RedisClientType } from "redis";
import { RedisError } from "../helpers/errors/Errors";
import { dropUndefinedKeys, sanitizeContent } from "../helpers/helpers";
import type { WatcherType } from "../watcherConfig.js";

/**
 * BaseWatcher
 *
 * Shared infrastructure for all watchers:
 * - Ingests entries from a Redis Stream (consumer group)
 * - Persists entries to SQL in batches
 * - Exposes API handlers (indexTable, indexGraph, view, refresh)
 *
 * Concrete watchers implement:
 * - filter extraction from HTTP requests
 * - table queries (instance/group)
 * - graph queries
 * - view/related metadata queries
 */
export abstract class BaseWatcher<
  T extends WatcherType = WatcherType,
> implements Watcher<T> {
  /** Redis client used for stream consumption + producing entries */
  protected readonly RedisClient: RedisClientType;

  /** Database adapter used to insert + query watcher data */
  protected readonly DBInstance: Database;

  /** Redis stream key for this watcher type (e.g. observatory:stream:request) */
  private streamKey: string;

  /** Redis consumer group name for this watcher type */
  private consumerGroup: string;

  /** Unique consumer name (PID + timestamp) so multiple processes can coexist */
  private consumerName: string;

  /**
   * Timer handle used to schedule the next ingest loop.
   * Note: this is set via setTimeout (not setInterval).
   */
  protected refreshInterval?: NodeJS.Timeout;

  /** Delay between ingest polling iterations (ms) */
  protected refreshIntervalDuration: number = 5000;

  /** Guard flag to stop all background work cleanly */
  private isStopped: boolean = false;

  /** Watcher type discriminator ("request", "log", "job", ...) */
  readonly type: T;

  constructor(redisClient: RedisClientType, DBInstance: Database, type: T) {
    this.RedisClient = redisClient;
    this.DBInstance = DBInstance;
    this.type = type;

    // Stream/group names are namespaced per watcher type
    this.streamKey = `observatory:stream:${this.type}`;
    this.consumerGroup = `observatory:group:${this.type}`;
    this.consumerName = `consumer:${process.pid}:${Date.now()}`;

    // Startup lifecycle:
    // 1) Ensure consumer group exists
    // 2) Cleanup/ACK pending messages already persisted (avoid duplicates)
    // 3) Start ingest loop
    this.createRedisStream();
    this.cleanupPendingOnStartup();
    this.ingestRedisStream();
  }

  /**
   * Creates the consumer group (and the stream if missing).
   * If the group already exists (BUSYGROUP), ignore.
   */
  private async createRedisStream(): Promise<void | undefined> {
    try {
      await this.RedisClient.xGroupCreate(
        this.streamKey,
        this.consumerGroup,
        "0",
        { MKSTREAM: true },
      );
      console.log(`Created consumer group for ${this.type}`);
    } catch (error: unknown) {
      // BUSYGROUP means the consumer group already exists
      if (error instanceof Error && error.message?.includes("BUSYGROUP")) return;

      // Anything else is a real Redis error
      throw new RedisError(`Error creating consumer group for ${this.type}:`, {
        cause: error as Error,
      });
    }
  }

  /**
   * Acknowledge messages after successful DB insert.
   * If the watcher is stopped, do nothing to avoid using a closed client.
   */
  private async acknowledgeMessages(messageIds: string[]) {
    if (this.isStopped) return;

    try {
      const result = await this.RedisClient.xAck(
        this.streamKey,
        this.consumerGroup,
        messageIds,
      );
      console.log("after xAck, result:", result);
    } catch (error) {
      // Avoid noisy logs during shutdown
      if (!this.isStopped) {
        console.error(`Error xAck messages for ${this.type}:`, error);
      }
    }
  }

  /**
   * Trim stream length to keep memory bounded.
   * Uses approximate trimming (~) to reduce Redis overhead.
   */
  private async trimStreamKeys() {
    if (this.isStopped) return;

    try {
      await this.RedisClient.xTrim(this.streamKey, "MAXLEN", 1000, {
        strategyModifier: "~",
      });
    } catch (error) {
      if (!this.isStopped) {
        console.error(`Error trimming data for ${this.type}:`, error);
      }
    }
  }

  /**
   * Insert a batch of parsed Redis stream entries into SQL.
   * IMPORTANT: If insert fails, we do NOT ACK so Redis can retry later.
   */
  private async insertIntoDB(parsedValues: WatcherEntry[]): Promise<void> {
    try {
      await this.DBInstance.insert(parsedValues);
      console.log("inserted into db: ", parsedValues.map(value => value.uuid));
    } catch (dbError) {
      console.error(`Error inserting batch data for ${this.type}:`, dbError);
      // Don't ACK if DB insert failed - messages will be retried
    }
  }

  /**
   * Pulls new messages from the Redis stream (consumer group read).
   * Returns:
   * - parsedValues: WatcherEntry[] ready for DB insert
   * - messageIds: stream IDs to ACK after success
   *
   * Uses BLOCK to long-poll for up to 1 second.
   */
  private async extractEntriesFromStream(): Promise<
    undefined | { parsedValues: WatcherEntry[]; messageIds: string[] }
  > {
    if (this.isStopped) return;

    try {
      const streams = await this.RedisClient.xReadGroup(
        this.consumerGroup,
        this.consumerName,
        [
          {
            key: this.streamKey,
            id: ">", // ">" means only new messages not yet delivered to the group
          },
        ],
        {
          COUNT: 500,  // batch size
          BLOCK: 1000, // wait up to 1s for new messages
        },
      );

      if (!streams || streams.length === 0) return;

      const parsedValues: WatcherEntry[] = [];
      const messageIds: string[] = [];

      // Redis returns: [{ name, messages: [{ id, message: { field: value } }] }]
      for (const stream of streams) {
        for (const messageObject of stream.messages) {
          const { message } = messageObject;

          // Normalize stream payload into your DB row shape
          const parsedEntry = {
            uuid: `${this.type}:${messageObject.id}`, // stable unique id
            type: message.type,
            content: JSON.parse(message.content),
            created_at: message.created_at,
            request_id: message.request_id,
            job_id: message.job_id,
            schedule_id: message.schedule_id,
          };

          parsedValues.push(parsedEntry);
          messageIds.push(messageObject.id);
        }
      }

      return { parsedValues, messageIds };
    } catch (error: unknown) {
      // Ignore errors during shutdown (client may already be closing)
      if (!this.isStopped) {
        console.error(
          `Error in Redis stream xReadGroup for ${this.type}:`,
          error,
        );
      }
    }
  }

  /**
   * Main ingest loop.
   * Uses a recursive setTimeout pattern to avoid overlapping runs.
   */
  private async ingestRedisStream() {
    const processMessages = async () => {
      if (this.isStopped) return;

      try {
        // Read from stream; default to empty arrays if no data
        const { parsedValues, messageIds } =
          (await this.extractEntriesFromStream()) ?? {
            parsedValues: [],
            messageIds: [],
          };

        if (parsedValues.length > 0) {
          // Persist -> ACK -> Trim
          await this.insertIntoDB(parsedValues);
          await this.acknowledgeMessages(messageIds);
          await this.trimStreamKeys();
        }
      } catch (error) {
        if (!this.isStopped) {
          console.error(
            `Error in Redis stream migration for ${this.type}:`,
            error,
          );
        }
      } finally {
        // Schedule the next polling cycle only if still active
        if (!this.isStopped) {
          this.refreshInterval = setTimeout(
            processMessages,
            this.refreshIntervalDuration,
          );
        }
      }
    };

    // Start immediately
    this.refreshInterval = setTimeout(processMessages, 0);
  }

  /**
   * On startup, handle the case where:
   * - messages were delivered (pending)
   * - app crashed before ACK
   * - DB insert may have already happened
   *
   * This checks pending messages and ACKs those already persisted, preventing duplicates.
   */
  private async cleanupPendingOnStartup() {
    try {
      const pending = await this.RedisClient.xPendingRange(
        this.streamKey,
        this.consumerGroup,
        "-",
        "+",
        100, // Check up to 100 pending messages
      );

      if (!pending || pending.length === 0) {
        return;
      }

      const messageIds = pending.map((p) => p.id);

      // DB lookup: which IDs have already been inserted?
      const existingUuids = await this.DBInstance.findExistingUuids(messageIds);

      if (existingUuids.length > 0) {
        await this.RedisClient.xAck(
          this.streamKey,
          this.consumerGroup,
          existingUuids,
        );
        console.log(
          `Cleaned up ${existingUuids.length} already-inserted pending messages for ${this.type}`,
        );
      }
    } catch (error) {
      console.error(
        `Error cleaning up pending messages for ${this.type}:`,
        error,
      );
    }
  }

  /**
   * Processes "stuck" pending messages:
   * - Claims messages idle > 60s
   * - Parses and inserts them
   * - ACKs them after success
   *
   * Used during cleanup/shutdown to reduce message backlog.
   */
  private async processPendingMessages() {
    try {
      const pending = await this.RedisClient.xPendingRange(
        this.streamKey,
        this.consumerGroup,
        "-", // start
        "+", // end
        100, // count
      );

      if (!pending || !Array.isArray(pending) || pending.length === 0) return;

      const messageIds = pending.map((msg: any) => msg.id);

      // Claim messages that have been idle (no consumer progress) for 60s
      const claimed = await this.RedisClient.xClaim(
        this.streamKey,
        this.consumerGroup,
        this.consumerName,
        60000,
        messageIds,
      );

      if (claimed && claimed.length > 0) {
        const parsedValues: WatcherEntry[] = [];
        const claimedIds: string[] = [];

        for (const message of claimed) {
          if (!message?.message) continue;

          try {
            const data = message.message;

            // Normalize the claimed message payload into DB shape
            const parsedEntry = {
              uuid: `${this.type}:${message.id}`,
              type: data.type,
              content:
                typeof data.content === "string"
                  ? JSON.parse(data.content)
                  : data.content,
              created_at: new Date(parseInt(data.created_at))
                .toISOString()
                .replace("T", " ")
                .substring(0, 19),
              request_id: data.request_id,
              job_id: data.job_id,
              schedule_id: data.schedule_id,
            };

            parsedValues.push(parsedEntry);
            claimedIds.push(message.id);
          } catch (error) {
            console.error(`Error parsing claimed message:`, error);
          }
        }

        // Insert and ACK claimed messages
        if (parsedValues.length > 0) {
          await this.DBInstance.insert(parsedValues);
          await this.RedisClient.xAck(
            this.streamKey,
            this.consumerGroup,
            claimedIds,
          );
        }
      }
    } catch (error) {
      console.error(
        `Error processing pending messages for ${this.type}:`,
        error,
      );
    }
  }

  /**
   * Push an entry into the watcher Redis stream.
   * Adds request_id/job_id/schedule_id from async-local-storage contexts.
   * Sanitizes + drops undefined fields to keep JSON stable and DB insert safe.
   */
  async insertRedisStream(entry: BaseLogEntry): Promise<void> {
    if (this.isStopped) return;

    const cleanContent = dropUndefinedKeys(sanitizeContent(entry));

    try {
      await this.RedisClient.xAdd(this.streamKey, "*", {
        request_id: requestLocalStorage.getStore()?.get("requestId") || "null",
        job_id: jobLocalStorage.getStore()?.get("jobId") || "null",
        schedule_id:
          scheduleLocalStorage.getStore()?.get("scheduleId") || "null",
        type: this.type,
        content: JSON.stringify(cleanContent),
        created_at:
          entry.created_at ||
          new Date().toISOString().replace("T", " ").substring(0, 19),
      });
    } catch (error) {
      if (!this.isStopped) {
        console.error(`Error adding to stream ${this.type}:`, error);
      }
    }
  }

  /**
   * Stops the ingest loop:
   * - Prevents future Redis/DB operations
   * - Clears scheduled timers
   */
  stop(): void {
    this.isStopped = true;
    if (this.refreshInterval) {
      clearTimeout(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  /**
   * Cleanup helper: stop + drain pending messages.
   * (Currently private and unused externally.)
   */
  private async cleanup() {
    this.stop();
    await this.processPendingMessages();
  }

  // ---------------------------------------------------------------------------
  // API handlers (used by routes/controllers)
  // ---------------------------------------------------------------------------

  /**
   * Table endpoint handler:
   * Parses filters from request, delegates to watcher-specific getTableData().
   */
  async indexTable(
    req: ObservatoryBoardRequest,
  ): Promise<ApiResponse<TableDataResponse<T, "instance" | "group">>> {
    const filters = this.extractFiltersFromRequest(req);
    const body = await this.getTableData(filters);
    return { body, statusCode: 200 };
  }

  /**
   * Graph endpoint handler:
   * Parses filters from request, delegates to watcher-specific countGraph().
   */
  async countGraph(
    req: ObservatoryBoardRequest,
  ): Promise<ApiResponse<CountGraphDataResponse>> {
    const filters = this.extractFiltersFromRequest(req);
    const body = await this.getCountGraphData(filters);
    return { body, statusCode: 200 };
  }

   /**
   * Graph endpoint handler:
   * Parses filters from request, delegates to watcher-specific durationGraph().
   */
  async durationGraph(
    req: ObservatoryBoardRequest,
  ): Promise<ApiResponse<DurationGraphDataResponse>> {
    const filters = this.extractFiltersFromRequest(req);
    const body = await this.getDurationGraphData(filters);
    return { body, statusCode: 200 };
  }

  /**
   * View endpoint handler:
   * Fetches a single entry and any related entries via watcher-specific getViewdata().
   */
  async view(
    req: ObservatoryBoardRequest,
  ): Promise<ApiResponse<ViewDataResponse>> {
    const body = await this.getViewdata(req.params.id);
    return { body, statusCode: 200 };
  }

  /**
   * Metadata endpoint handler:
   * Placeholder (currently returns empty object).
   * Intended to call getMetadata() in the future.
   */
  async metadata(
    req: ObservatoryBoardRequest,
  ): Promise<ApiResponse<Record<string, any>>> {

    const { requestId, jobId, scheduleId } = req.body;
    const body = await this.getMetadata({ requestId, jobId, scheduleId });

    return { body, statusCode: 200 };
  }

  /**
   * Refresh endpoint:
   * Restarts the ingest loop immediately.
   *
   * NOTE: refreshInterval was scheduled via setTimeout; use clearTimeout here.
   */
  async refresh(): Promise<ApiResponse<{ message: string }>> {
    this.refreshInterval && clearTimeout(this.refreshInterval);
    await this.ingestRedisStream();
    return {
      body: { message: "Interval has been refreshed." },
      statusCode: 200,
    };
  }

  /**
   * Allows derived classes to change poll interval at runtime.
   * Clears current timer and restarts ingest loop with new duration.
   *
   * NOTE: refreshInterval uses setTimeout; use clearTimeout here.
   */
  protected updateRefreshInterval = (interval: number): void => {
    if (this.refreshInterval) {
      clearTimeout(this.refreshInterval);
      this.refreshInterval = undefined;
    }
    this.refreshIntervalDuration = interval;
    this.ingestRedisStream();
  };

  // ---------------------------------------------------------------------------
  // Abstract methods (implemented by GenericWatcher / specialized watchers)
  // ---------------------------------------------------------------------------

  /** Convert incoming request query params into DB filters */
  protected abstract extractFiltersFromRequest(
    req: ObservatoryBoardRequest,
  ): WatcherFilters;

  /** Fetch entry by id + its related entries (request/log/query/job/etc) */
  protected abstract getViewdata(id: string): Promise<ViewDataResponse>;

  /** Fetch related metadata by explicit linkage IDs */
  protected abstract getMetadata({
    requestId,
    jobId,
    scheduleId,
  }: {
    requestId: string;
    jobId: string;
    scheduleId: string;
  }): Promise<any>;

  /** Fetch chartable time-series data for the resource */
  protected abstract getCountGraphData(
    filters: WatcherFilters,
  ): Promise<CountGraphDataResponse>;

  /** Fetch chartable time-series data for the resource */
  protected abstract getDurationGraphData(
    filters: WatcherFilters,
  ): Promise<DurationGraphDataResponse>;

  /** Fetch table data (instance rows or group aggregates) */
  protected abstract getTableData(
    filters: WatcherFilters & { index: "instance" | "group" },
  ): Promise<TableDataResponse<T, "instance" | "group">>;
}
