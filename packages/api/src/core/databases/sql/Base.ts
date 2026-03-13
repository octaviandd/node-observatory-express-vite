/** @format */

import { Connection, FieldPacket, QueryResult } from "mysql2/promise";
import { PERIODS } from "../../helpers/constants.js";
import { processedDurationGraphData, processedCountGraphData, formatValue } from "../../helpers/helpers.js";
import { MigrationError, DatabaseRetrieveError } from "../../helpers/errors/Errors.js";

// SQL builders: each watcher type has its own query builder implementation.
// Builders generate watcher-specific SQL for list (instance/group) and graph queries.
import ModelWatcherSQL from "./ModelWatcherSQLBuilder.js";
import RequestWatcherSQL from "./RequestWatcherSQLBuilder.js";
import ScheduleWatcherSQL from "./ScheduleViewerSQLBuilder.js";
import ViewWatcherSQL from "./ViewsWatcherSQLBuilder.js";
import CacheWatcherSQL from "./CacheWatcherSQLBuilder.js";
import ExceptionWatcherSQL from "./ExceptionWatcherSQLBuilder.js";
import LogWatcherSQL from "./LogWatcherSQLBuilder.js";
import NotificationWatcherSQL from "./NotificationWatcherSQLBuilder.js";
import QueryWatcherSQL from "./QueryWatcherSQLBuilder.js";
import HTTPClientWatcherSQL from "./HTTPClientWatcherSQLBuilder.js";
import JobWatcherSQL from "./JobWatcherSQLBuilder.js";
import MailWatcherSQL from "./MailWatcherSQLBuilder.js";

/**
 * Base (Database Adapter)
 *
 * Central DB layer used by all watchers. Responsibilities:
 * - migrations (create/drop observatory_entries)
 * - inserts (batch insert from Redis stream)
 * - single entry retrieval
 * - list queries via watcher-specific SQL builders:
 *     - instance mode (raw rows)
 *     - group mode (aggregated rows)
 * - view linkage queries (related entries by request/job/schedule id)
 * - graph queries (aggregate + time-series rows in one call)
 *
 * Note: "builders" are responsible for generating watcher-specific SQL fragments.
 */
class Base {
	/** mysql2/promise connection used for all queries */
	storeConnection!: Connection;

	/**
	 * Watcher SQL builders indexed by watcher type.
	 * Each builder knows how to build instance/group SQL for that watcher.
	 */
	private builders: {
		request: RequestWatcherSQL;
		model: ModelWatcherSQL;
		view: ViewWatcherSQL;
		schedule: ScheduleWatcherSQL;
		cache: CacheWatcherSQL;
		exception: ExceptionWatcherSQL;
		log: LogWatcherSQL;
		notification: NotificationWatcherSQL;
		query: QueryWatcherSQL;
		http: HTTPClientWatcherSQL;
		job: JobWatcherSQL;
		mail: MailWatcherSQL;
	};

	constructor(storeConnection: Connection) {
		this.storeConnection = storeConnection;

		// Instantiate all watcher builders once so DB queries can select by watcher type.
		this.builders = {
			request: new RequestWatcherSQL(),
			model: new ModelWatcherSQL(),
			view: new ViewWatcherSQL(),
			schedule: new ScheduleWatcherSQL(),
			cache: new CacheWatcherSQL(),
			exception: new ExceptionWatcherSQL(),
			log: new LogWatcherSQL(),
			notification: new NotificationWatcherSQL(),
			query: new QueryWatcherSQL(),
			http: new HTTPClientWatcherSQL(),
			job: new JobWatcherSQL(),
			mail: new MailWatcherSQL(),
		};
	}

	// ---------------------------------------------------------------------------
	// Migration helpers
	// ---------------------------------------------------------------------------

	/**
	 * Creates the observatory_entries table if it does not exist.
	 * Uses information_schema to avoid failing if table already exists.
	 */
	async up(connection: Connection): Promise<void> {
		try {
			// Check if the table exists in the current schema
			const [rows]: any = await connection.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        AND table_name = 'observatory_entries'
      `);

			// Only create the table if it doesn't exist
			if (rows[0].count === 0) {
				await connection.query(`
          CREATE TABLE observatory_entries (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,

            -- uuid is the stable unique identifier used across UI and DB
            uuid CHAR(36) NOT NULL UNIQUE,

            -- linkage columns to join related entries in "view" screens
            request_id CHAR(36) NULL,
            job_id CHAR(36) NULL,
            schedule_id CHAR(36) NULL,

            -- watcher type (request/log/job/etc)
            type VARCHAR(20) NOT NULL,

            -- raw patcher output stored as JSON (status/metadata/data/error/etc)
            content JSON NOT NULL,

            -- microsecond timestamps for correct ordering and tight time windows
            created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),

            -- indices for common query patterns (by uuid, linkage, type, time)
            INDEX idx_uuid (uuid),
            INDEX idx_request_id (request_id),
            INDEX idx_job_id (job_id),
            INDEX idx_schedule_id (schedule_id),
            INDEX idx_type (type),
            INDEX idx_created_at (created_at)
          );
        `);
			}
		} catch (error: unknown) {
			throw new MigrationError("Failed to up base tables", { cause: error as Error });
		}
	}

	/**
	 * Drops observatory_entries table.
	 * Intended for local dev/test or full reset migrations.
	 */
	async down(connection: Connection): Promise<void> {
		try {
			await connection.query("DROP TABLE IF EXISTS observatory_entries;");
		} catch (error) {
			throw new MigrationError("Failed to down base tables", { cause: error as Error });
		}
	}

	// ---------------------------------------------------------------------------
	// Writes
	// ---------------------------------------------------------------------------

	/**
	 * Batch insert of Redis stream entries into SQL.
	 * Wraps inserts in a transaction for consistency across batch.
	 *
	 * NOTE: uuid is UNIQUE so duplicates will error; caller should handle retries.
	 */
	async insert(redisEntries: WatcherEntry[]) {
		if (redisEntries.length === 0) return;

		try {
			await this.storeConnection.query("START TRANSACTION");

			// Build a single INSERT with multiple VALUES (...) blocks
			const placeholders = redisEntries.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");

			// Flatten entry fields to match placeholder order
			const values = redisEntries.flatMap((entry) => [
				entry.uuid,
				entry.request_id,
				entry.job_id,
				entry.schedule_id,
				entry.type,
				typeof entry.content === "string" ? entry.content : JSON.stringify(entry.content),
				entry.created_at,
			]);

			await this.storeConnection.query(
				`INSERT INTO observatory_entries (uuid, request_id, job_id, schedule_id, type, content, created_at) VALUES ${placeholders}`,
				values,
			);

			await this.storeConnection.query("COMMIT");
		} catch (error) {
			// If anything fails, rollback entire batch insert
			await this.storeConnection.query("ROLLBACK");
			throw new MigrationError("Failed to insert into database", { cause: error as Error });
		}
	}

	/**
	 * Delete a single entry by uuid.
	 * Returns boolean for convenience; throws on DB errors.
	 */
	async delete(uuid: string): Promise<boolean> {
		try {
			this.storeConnection.query(`DELETE FROM observatory_entries WHERE uuid = ?`, [uuid]);
			return true;
		} catch (error) {
			throw new MigrationError("Failed to delete from database", { cause: error as Error });
		}
	}

	// ---------------------------------------------------------------------------
	// Reads: simple lookup
	// ---------------------------------------------------------------------------

	/**
	 * Fetch a single entry row by UUID.
	 * This is used by watcher view endpoints to render the main record.
	 */
	async getEntry(uuid: string): Promise<WatcherEntry> {
		try {
			const [rows] = (await this.storeConnection.query(`SELECT * FROM observatory_entries WHERE uuid = ?`, [uuid])) as [
				QueryResult,
				FieldPacket[],
			];

			return (rows as unknown as WatcherEntry[])[0];
		} catch (error) {
			throw new MigrationError("Failed to get entry by uuid from database", { cause: error as Error });
		}
	}

	/**
	 * Fetch all entries by watcher type (used in tests/debug tooling).
	 */
	async getAllEntriesByType(type: string): Promise<WatcherEntry[]> {
		try {
			const [results] = (await this.storeConnection.query("SELECT * FROM observatory_entries WHERE type = ?", [type])) as [
				QueryResult,
				FieldPacket[],
			];

			return results as unknown as WatcherEntry[];
		} catch (error) {
			throw new MigrationError("Failed to get all entries by type from database", { cause: error as Error });
		}
	}

	/**
	 * Used by watcher startup cleanup: check which pending Redis ids already exist in DB.
	 */
	async findExistingUuids(uuids: string[]): Promise<string[]> {
		if (uuids.length === 0) return [];

		const [rows] = await this.storeConnection.query(`SELECT uuid FROM observatory_entries WHERE uuid IN (?)`, [uuids]);

		return (rows as { uuid: string }[]).map((r) => r.uuid);
	}

	// ---------------------------------------------------------------------------
	// Reads: list table queries (instance/group)
	// ---------------------------------------------------------------------------

	/**
	 * Instance mode:
	 * Returns raw rows matching filters + separate count query.
	 * SQL is produced by the watcher-specific builder.
	 */
	async getByInstance(filters: any, watcherType: WatcherType): Promise<{ results: ClientResponse[]; count: number }> {
		const builder = this.builders[watcherType];

		try {
			// Query for page items
			const [results] = (await this.storeConnection.query(builder.getIndexTableDataByInstanceSQL(filters).items)) as [
				QueryResult,
				FieldPacket[],
			];

			// Query for total count
			const [count] = (await this.storeConnection.query(builder.getIndexTableDataByInstanceSQL(filters).count)) as [any[], FieldPacket[]];

			return { results: results as unknown as ClientResponse[], count: count[0]?.total ?? 0 };
		} catch (error: unknown) {
			throw new MigrationError("Failed to get instance data from database", { cause: error as Error });
		}
	}

	/**
	 * Group mode:
	 * Returns aggregated rows based on watcher-specific grouping rules + count query.
	 */
	async getByGroup<T extends WatcherType>(
		filters: FiltersByWatcherType[T],
		watcherType: T,
	): Promise<{ results: ClientGroupResponses[]; count: number }> {
		const builder = this.builders[watcherType];

		try {
			const sql = builder.getIndexTableDataByGroupSQL(filters as any);
			const [results] = (await this.storeConnection.query(sql.items)) as [QueryResult, FieldPacket[]];
			const [count] = (await this.storeConnection.query(sql.count)) as [any[], FieldPacket[]];
			return { results: results as unknown as ClientGroupResponses[], count: count[0]?.total ?? 0 };
		} catch (error: unknown) {
			throw new DatabaseRetrieveError("Failed to get group data from database", { cause: error as Error });
		}
	}
	/**
	 * Fetch "related" view data by matching any of the given conditions (OR group).
	 * - conditions: ["request_id = ?", "job_id = ?"]
	 * - params: ["req-123", "job-456"]
	 *
	 * `type` is excluded (type != ?) so view doesn't redundantly include the root type
	 * if caller wants to remove duplicates; extraCondition is appended when needed.
	 */
	async getRelatedViewdata(conditions: string[], params: string[], type: string, extraCondition = ""): Promise<WatcherEntry[]> {
		if (!conditions || conditions.length === 0) return [];

		try {
			// OR together the linkage conditions
			const whereClause = "(" + conditions.join(" OR ") + ")";

			// Optionally exclude a type (used when viewing a single type)
			const typeCondition = type ? " AND type != ?" : "";
			const queryParams = type ? [...params, type] : params;

			const [relatedItems] = (await this.storeConnection.query(
				"SELECT * FROM observatory_entries WHERE " + whereClause + typeCondition + (extraCondition ? " " + extraCondition : ""),
				queryParams,
			)) as [QueryResult, FieldPacket[]];

			return relatedItems as unknown as WatcherEntry[];
		} catch (error: unknown) {
			throw new DatabaseRetrieveError("Failed to get related view data from database", { cause: error as Error });
		}
	}

	// ---------------------------------------------------------------------------
	// Reads: graph query (aggregate + raw rows, then processed in JS)
	// ---------------------------------------------------------------------------

	/**
	 * Count graph data query:
	 * Fetches count-related metrics and time-bucketed count series
	 */
	async getCountGraphData<T extends WatcherType>(filters: FiltersByWatcherType[T], watcherType: T, keys: string[]) {
		const { period } = filters;

		try {
			// Delegate SQL generation to the watcher-specific builder
			const sql = this.builders[watcherType].getIndexGraphDataSQL(filters as any);

			const [results] = (await this.storeConnection.query(sql)) as [QueryResult, FieldPacket[]];

			// First row is the aggregate; remaining rows are raw event data
			//@ts-ignore
			const aggregateRow = (results as any[]).shift();

			// Build count series (bucketed based on period + watcher keys)
			const countFormattedData = processedCountGraphData(results as any[], period, keys);

			// Dynamically map keys to indexCountOne/Two/Three/etc.
			const kv = (i: number) => formatValue(aggregateRow?.[keys[i]], true);

			// Return UI-friendly formatted count values
			return {
				countFormattedData,
				count: formatValue(aggregateRow?.total, true),
				// Required fields — always populated (defaults to "0" if key doesn't exist)
				indexCountOne: kv(0),
				indexCountTwo: kv(1),
				indexCountThree: kv(2),

				// Optional fields — only populated if the watcher has that many metrics
				...(keys[3] !== undefined && { indexCountFour: kv(3) }),
				...(keys[4] !== undefined && { indexCountFive: kv(4) }),
				...(keys[5] !== undefined && { indexCountSix: kv(5) }),
				...(keys[6] !== undefined && { indexCountSeven: kv(6) }),
				...(keys[7] !== undefined && { indexCountEight: kv(7) }),
			};
		} catch (error) {
			throw new DatabaseRetrieveError("Failed to get count graph data from database", { cause: error as Error });
		}
	}

	/**
	 * Duration graph data query:
	 * Fetches duration-related metrics and time-bucketed duration series
	 */
	async getDurationGraphData<T extends WatcherType>(filters: FiltersByWatcherType[T], watcherType: T) {
		const { period } = filters;

		try {
			const hasDuration = watcherType !== "exception" && watcherType !== "log";

			if (!hasDuration) {
				return { durationFormattedData: {}, shortest: "0ms", longest: "0ms", average: "0ms", p95: "0ms" };
			}

			// Delegate SQL generation to the watcher-specific builder
			const sql = this.builders[watcherType].getIndexGraphDataSQL(filters as any);

			const [results] = (await this.storeConnection.query(sql)) as [QueryResult, FieldPacket[]];

			// First row is the aggregate; remaining rows are raw event data
			//@ts-ignore
			const aggregateRow = (results as any[]).shift();

			// Build duration series
			const durationFormattedData = processedDurationGraphData(results as any[], period);

			// Return UI-friendly formatted duration values
			return {
				durationFormattedData,
				shortest: formatValue(aggregateRow?.shortest),
				longest: formatValue(aggregateRow?.longest),
				average: formatValue(aggregateRow?.average),
				p95: formatValue(aggregateRow?.p95),
			};
		} catch (error) {
			throw new DatabaseRetrieveError("Failed to get duration graph data from database", { cause: error as Error });
		}
	}
}

export default Base;
