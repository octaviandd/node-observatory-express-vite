import { Connection, FieldPacket, QueryResult } from "mysql2/promise";
import { PERIODS } from "../../helpers/constants.js";
import { processedDurationGraphData, processedCountGraphData, formatValue } from "../../helpers/helpers.js";
import { MigrationError, DatabaseRetrieveError } from "../../helpers/errors/Errors.js";
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

class Base {
  storeConnection!: Connection
  private builders: {
    request: RequestWatcherSQL,
    model: ModelWatcherSQL,
    view: ViewWatcherSQL,
    schedule: ScheduleWatcherSQL,
    cache: CacheWatcherSQL,
    exception: ExceptionWatcherSQL,
    log: LogWatcherSQL,
    notification: NotificationWatcherSQL,
    query: QueryWatcherSQL,
    http: HTTPClientWatcherSQL,
    job: JobWatcherSQL,
    mail: MailWatcherSQL
  };

  constructor(storeConnection: Connection) {
    this.storeConnection = storeConnection;

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

  async up(
    connection: Connection,
  ): Promise<void> {
    try {
      const [rows]: any = await connection.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        AND table_name = 'observatory_entries'
      `);

      if (rows[0].count === 0) {
        await connection.query(`
          CREATE TABLE observatory_entries (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            uuid CHAR(36) NOT NULL UNIQUE,
            request_id CHAR(36) NULL,
            job_id CHAR(36) NULL,
            schedule_id CHAR(36) NULL,
            type VARCHAR(20) NOT NULL,
            content JSON NOT NULL,
            created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),

            INDEX idx_uuid (uuid),
            INDEX idx_request_id (request_id),
            INDEX idx_job_id (job_id),
            INDEX idx_schedule_id (schedule_id),
            INDEX idx_type (type),
            INDEX idx_created_at (created_at)
          );
        `);
        console.log("observatory_entries table created via mysql2/promise");
      }
    } catch (error: unknown) {
      throw new MigrationError('Failed to up base tables', {cause: (error as Error)});
    }
  }

  async down(
    connection: Connection,
  ): Promise<void> {
    try {
      await connection.query(
        "DROP TABLE IF EXISTS observatory_entries;",
      );
      console.log("observatory_entries table droped via mysql2/promise");
    } catch (error) {
      throw new MigrationError('Failed to down base tables', {cause: (error as Error)});
    }
  }

  async insert(redisEntries: RedisEntry[]) {
    if (redisEntries.length === 0) return;

    try {
      await this.storeConnection.query("START TRANSACTION");

      const placeholders = redisEntries.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
      const values = redisEntries.flatMap(entry => [
        entry.uuid,
        entry.request_id,
        entry.job_id,
        entry.schedule_id,
        entry.type,
        typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content),
        entry.created_at,
      ]);

      await this.storeConnection.query(
        `INSERT INTO observatory_entries (uuid, request_id, job_id, schedule_id, type, content, created_at) VALUES ${placeholders}`,
        values
      );

      await this.storeConnection.query("COMMIT");
    } catch (error) {
      await this.storeConnection.query("ROLLBACK");
      throw new MigrationError('Failed to insert into database', {cause: (error as Error)});
    }
  }

  async delete(uuid: string): Promise<boolean> {
    try {
      this.storeConnection.query(`DELETE FROM observatory_entries WHERE uuid = ?`, [uuid])
      return true;
    } catch (error) {
      throw new MigrationError('Failed to delete from database', {cause: (error as Error)});
    }
  }

  async getEntry(uuid: string): Promise<WatcherEntry> {
    try {
      const [rows] = await this.storeConnection.query(
        `SELECT * FROM observatory_entries WHERE uuid = ?`,
        [uuid]
      ) as [QueryResult, FieldPacket[]];

      return (rows as unknown as WatcherEntry[])[0];
    } catch (error) {
      throw new MigrationError('Failed to get entry by uuid from database', {cause: (error as Error)});
    }
  }

  async getAllEntriesByType(type: string): Promise<WatcherEntry[]> {
    try {
      const [results] = await this.storeConnection.query(
        "SELECT * FROM observatory_entries WHERE type = ?",
        [type],
      ) as [QueryResult, FieldPacket[]];
    
      return results as unknown as WatcherEntry[];
    } catch (error) {
      throw new MigrationError('Failed to get all entries by type from database', {cause: (error as Error)});
    }
  }

  async findExistingUuids(uuids: string[]): Promise<string[]> {
    if (uuids.length === 0) return [];
    
    const [rows] = await this.storeConnection.query(
      `SELECT uuid FROM observatory_entries WHERE uuid IN (?)`,
      [uuids]
    );
    
    return (rows as { uuid: string }[]).map(r => r.uuid);
  }

  getPeriodSQL = (period: string): string => period ? `AND created_at >= UTC_TIMESTAMP() - ${PERIODS[period].interval}` : '';
  getEqualitySQL = (value: string, type: string): string => value ? `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.${type}')) = '${value}'` : '';
  getInclusionSQL = (value: string, type: string): string => value ? `AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(content, '$.${type}'))) LIKE '%${value.toLowerCase()}%'` : "";

  private getDurationParametersSQL = (watcherType: WatcherType): string => {
    if (watcherType === 'exception' || watcherType === 'log') {
      return ``
    }
    return `MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10, 6))) as shortest,
      MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10, 6))) as longest,
      AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10, 6))) as average,
    `
  }

  getP95SQL(watcherType: WatcherType): string {
    if (watcherType === 'exception' || watcherType === 'log') return ''

    return `
      CAST(
        SUBSTRING_INDEX(
          SUBSTRING_INDEX(
            GROUP_CONCAT(
              CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))
              ORDER BY CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))
              SEPARATOR ','
            ),
            ',',
            CEILING(COUNT(*) * 0.95)
          ),
          ',',
          -1
        ) AS DECIMAL(10,2)
      ) AS p95
    `
  }
  
  async getByInstance(filters: any, watcherType: WatcherType): Promise<{ results: WatcherEntry[], count: number }> {
    const builder = this.builders[watcherType];
    try {
      const [ results ] = await this.storeConnection.query(
        builder.getIndexTableDataByInstanceSQL(filters).items) as [QueryResult, FieldPacket[]
      ];
      
      const [ count ] = await this.storeConnection.query(
        builder.getIndexTableDataByInstanceSQL(filters).count) as [QueryResult & {total: number}, FieldPacket[]
      ];
      
      return { results: results as unknown as WatcherEntry[], count: count.total };
    } catch (error: unknown) {
      throw new MigrationError('Failed to get instance data from database', {cause: (error as Error)});
    }
  }

  async getByGroup(filters: any, watcherType: WatcherType): Promise<{ results: WatcherEntry[], count: number }> {
    const builder = this.builders[watcherType];

    try {
      const [ results ] = await this.storeConnection.query(
        builder.getIndexTableDataByGroupSQL(filters).items) as [QueryResult, FieldPacket[]
        ];
      
      const [count] = await this.storeConnection.query(
        builder.getIndexTableDataByGroupSQL(filters).count) as [QueryResult & { total: number }, FieldPacket[]
      ]
      
      return { results: results as unknown as WatcherEntry[], count: count.total };
    } catch (error: unknown) {
      throw new DatabaseRetrieveError('Failed to get group data from database', {cause: (error as Error)});
    }
  }

  async getRelatedViewdata(conditions: string[], params: string[], type: string, extraCondition = ''): Promise<WatcherEntry[]> {
    if (!conditions || conditions.length === 0) return [];

    try {
      const whereClause = "(" + conditions.join(" OR ") + ")";
      const typeCondition = type ? " AND type != ?" : "";
      const queryParams = type ? [...params, type] : params;

      const [ relatedItems ] = await this.storeConnection.query(
        "SELECT * FROM observatory_entries WHERE " +
          whereClause +
          typeCondition +
          (extraCondition ? " " + extraCondition : ""),
        queryParams,
      ) as [QueryResult, FieldPacket[]];

      return relatedItems as unknown as WatcherEntry[];
    } catch (error: unknown) {
      throw new DatabaseRetrieveError('Failed to get related view data from database', {cause: (error as Error)});
    }
  }

  async getGraphData(filters: any, watcherType: WatcherType, keys: string[], hasDuration?: boolean){
    const { period, key } = filters;
    const periodSql = this.getPeriodSQL(period);
    const keySql = this.getEqualitySQL(key, "key");

    const durationSql = this.getDurationParametersSQL(watcherType);
    const p95Sql = this.getP95SQL(watcherType);
    const p95Column = p95Sql ? `${p95Sql},` : 'NULL as p95,';

    try {
      const [results] = (await this.storeConnection.query(
        `(
          SELECT
            COUNT(*) as total,
            ${durationSql}
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) > 0 THEN 1 ELSE 0 END) as misses,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) > 0 THEN 1 ELSE 0 END) as hits,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) > 0 THEN 1 ELSE 0 END) as writes,
            ${p95Column},
            NULL as created_at,
            NULL as content,
            'aggregate' as type
          FROM observatory_entries
          WHERE type = ? ${periodSql} ${keySql}
        )
        UNION ALL
        (
          SELECT
            NULL as total,
            NULL as shortest,
            NULL as longest,
            NULL as average,
            NULL as p95,
            NULL as misses,
            NULL as hits,
            NULL as writes,
            created_at,
            content,
            'row' as type
          FROM observatory_entries
          WHERE type = ? ${periodSql} ${keySql}
          ORDER BY created_at DESC
        );`,
        [watcherType, watcherType]
      )) as [QueryResult, FieldPacket[]];

      //@ts-ignore
      let cleanResults = results.shift();

      const aggregateResults: {
        total: number;
        shortest: string | null;
        longest: string | null;
        average: string | null;
        misses: string | null;
        hits: string | null;
        writes: string | null;
        p95: string | null;
      } = cleanResults;

      const countFormattedData = processedCountGraphData(results as unknown as CacheContent[], period, keys);
      const durationFormattedData = hasDuration ? processedDurationGraphData(results, period): {};

      return {
        countFormattedData,
        durationFormattedData,
        count: formatValue(aggregateResults.total, true),
        indexCountOne: formatValue(aggregateResults.hits, true),
        indexCountTwo: formatValue(aggregateResults.writes, true),
        indexCountThree: formatValue(aggregateResults.misses, true),
        shortest: formatValue(aggregateResults.shortest),
        longest: formatValue(aggregateResults.longest),
        average: formatValue(aggregateResults.average),
        p95: formatValue(aggregateResults.p95),
      };
    } catch (error) {
      throw new DatabaseRetrieveError('Failed to get graph data from database', {cause: (error as Error)});
    }
  }
}

export default Base;