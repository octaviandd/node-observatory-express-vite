import { Connection, FieldPacket, QueryResult } from "mysql2/promise";
import { PERIODS } from "./helpers/constants";
import { formattCountGraphData, formattDurationGraphData, formatValue } from "./helpers/helpers";

interface IDatabase {
  up: () => {}
  down: () => {}
}


class Database {
  storeConnection!: Connection

  constructor(storeConnection: Connection) {
    this.storeConnection = storeConnection;
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
    } catch (error) {
      console.log(error)
      throw error;
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
      console.log(error)
      throw error;
    }
  }

  async insert(redisEntry: any) {
    try {
      await this.storeConnection.query("START TRANSACTION");
      await this.storeConnection.query(
        "INSERT INTO observatory_entries (uuid, request_id, job_id, schedule_id, type, content, created_at) VALUES ?",
        [
          redisEntry.map((entry: any) => [
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
      console.log(error)
      throw error;
    }
  }

  async delete(uuid: string): Promise<boolean> {
    try {
      this.storeConnection.query(`DELETE FROM observatory_entries WHERE uuid = ?`, [uuid])
      return true;
    } catch (error) {
      console.log(error)
      throw error;
    }
  }

  async getEntry(uuid: string): Promise<WatcherEntry> {
    try {
      const results = await this.storeConnection.query(
        `SELECT * FROM observatory_entries WHERE uuid = ?`,
        [uuid]
      ) as [QueryResult, FieldPacket[]];

      return results[0] as unknown as WatcherEntry;
    } catch (error) {
      console.log(error)
      throw error;
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
      console.log(error)
      throw error;
    }
  }

  private getPeriodSQL(period: string): string {
    return `AND created_at >= UTC_TIMESTAMP() - ${PERIODS[period].interval}`;
  }

  private getEqualitySQL = (value: string, type: string): string => {
    return `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.${type}')) = '${value}'`;
  };

  private getInclusionSQL = (value: string, type: string): string => {
    return `AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(content, '$.${type}'))) LIKE '%${value.toLowerCase()}%'`;
  };

  private getDurationParametersSQL(): string {
    return `MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10, 6))) as shortest,
      MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10, 6))) as longest,
      AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10, 6))) as average,
    `
  }

  // reduce this to one key like: grouping_key
  private getGroupMainKey(watcherType: string): { sql: string; key: string } {
    const mapping: Record<string, { sql: string; key: string }> = {
      'cache': { 
        sql: `JSON_UNQUOTE(JSON_EXTRACT(content, '$.key')) as cache_key,`,
        key: 'key'
      },
      'exception': { 
        sql: `JSON_UNQUOTE(JSON_EXTRACT(content, '$.message')) as header,`,
        key: 'message'
      },
      'http-client': { 
        sql: `JSON_UNQUOTE(JSON_EXTRACT(content, '$.origin')) AS route,`,
        key: 'origin'
      },
      'job': { 
        sql: `JSON_UNQUOTE(JSON_EXTRACT(content, '$.queue')) AS queue,`,
        key: 'queue'
      },
      'log': { 
        sql: `JSON_UNQUOTE(JSON_EXTRACT(content, '$.message')) as message,`,
        key: 'message'
      },
      'mail': { 
        sql: `JSON_UNQUOTE(JSON_EXTRACT(content, '$.to')) as mail_to,`,
        key: 'to'
      },
      'model': { 
        sql: `JSON_UNQUOTE(JSON_EXTRACT(content, '$.modelName')) as modelName,`,
        key: 'modelName'
      },
      'notification': { 
        sql: `JSON_UNQUOTE(JSON_EXTRACT(content, '$.channel')) AS channel,`,
        key: 'channel'
      },
      'query': { 
        sql: `JSON_UNQUOTE(JSON_EXTRACT(content, '$.sql')) as endpoint,`,
        key: 'sql'
      },
      'request': { 
        sql: `JSON_UNQUOTE(JSON_EXTRACT(content, '$.route')) as route,`,
        key: 'route'
        },
      'schedule': { 
        sql: `JSON_UNQUOTE(JSON_EXTRACT(content, '$.scheduleId')) AS scheduleId,`,
        key: 'scheduleId'
      },
      'view': { 
        sql: `JSON_UNQUOTE(JSON_EXTRACT(content, '$.view')) as view,`,
        key: 'view'
      }
    };

    return mapping[watcherType];
  }

  private getWatcherSpecificStatementsSQL(watcherType: string): string {
    let statement = ''
    if (watcherType === 'cache') {
      statement = `
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) > 0 THEN 1 ELSE 0 END) as misses,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) > 0 THEN 1 ELSE 0 END) as hits,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) > 0 THEN 1 ELSE 0 END) as writes,
      `
    }

    return statement
  }

  private getP95SQL(watcherType: string): string {
    if (watcherType === 'exception' || watcherType === 'log') {
      return ''
    }

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

  private getWatcherSpecificFiltersSQL(watcherType: string, filters: any): string {
    let conditions: string[] = [];

    switch (watcherType) {
      case 'cache':
        if (filters.cacheType && filters.cacheType !== 'all') {
          conditions.push(`JSON_UNQUOTE(JSON_EXTRACT(content, '$.${filters.cacheType}')) IS NOT NULL`);
        }
        if (filters.key) {
          conditions.push(this.getEqualitySQL(filters.key, 'key'));
        }
        break;

      case 'request':
      case 'http-client':
        if (filters.status && filters.status !== 'all') {
          const statusCode = filters.status.charAt(0); // '2', '4', or '5'
          conditions.push(`JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '${statusCode}%'`);
        }
        if (filters.key) {
          conditions.push(this.getEqualitySQL(filters.key, watcherType === 'request' ? 'route' : 'origin'));
        }
        break;

      case 'job':
        if (filters.jobStatus && filters.jobStatus !== 'all') {
          conditions.push(this.getEqualitySQL(filters.jobStatus, 'status'));
        }
        if (filters.queueFilter && filters.queueFilter !== 'all') {
          // Add queue-specific filters (errors, slow, etc.)
        }
        if (filters.key) {
          conditions.push(this.getEqualitySQL(filters.key, 'queue'));
        }
        break;
      
      case 'mail':
        if (filters.status && filters.status !== 'all') {
          conditions.push(this.getEqualitySQL(filters.status, 'status'));
        }
        if (filters.key) {
          conditions.push(this.getEqualitySQL(filters.key, 'to'));
        }
        break;

      case 'log':
        if (filters.logType && filters.logType !== 'All') {
          conditions.push(this.getEqualitySQL(filters.logType.toLowerCase(), 'level'));
        }
        if (filters.key) {
          conditions.push(this.getInclusionSQL(filters.key, 'message'));
        }
        break;

      case 'schedule':
        if (filters.status && filters.status !== 'all') {
          conditions.push(this.getEqualitySQL(filters.status, 'status'));
        }
        if (filters.key) {
          conditions.push(this.getEqualitySQL(filters.key, 'scheduleId'));
        }
        break;

      case 'exception':
        if (filters.type && filters.type !== 'all') {
          conditions.push(this.getEqualitySQL(filters.type, 'type'));
        }
        if (filters.key) {
          conditions.push(this.getInclusionSQL(filters.key, 'message'));
        }
        break;
      
        case 'notification':
        if (filters.type) {
          conditions.push(this.getEqualitySQL(filters.type, 'type'));
        }
        if (filters.channel) {
          conditions.push(this.getEqualitySQL(filters.channel, 'channel'));
        }
        if (filters.status && filters.status !== 'all') {
          conditions.push(this.getEqualitySQL(filters.status, 'status'));
        }
        break;

      case 'query':
        if (filters.status && filters.status !== 'all') {
          conditions.push(this.getEqualitySQL(filters.status, 'status'));
        }
        if (filters.key) {
          conditions.push(this.getInclusionSQL(filters.key, 'sql'));
        }
        break;

      case 'model':
        if (filters.model) {
          conditions.push(this.getEqualitySQL(filters.model, 'modelName'));
        }
        if (filters.status && filters.status !== 'all') {
          conditions.push(this.getEqualitySQL(filters.status, 'status'));
        }
        break;

      case 'view':
        if (filters.path) {
          conditions.push(this.getEqualitySQL(filters.path, 'view'));
        }
        if (filters.status && filters.status !== 'all') {
          conditions.push(this.getEqualitySQL(filters.status, 'status'));
        }
        break;
    }

    return conditions.join(' ');
  }

  async getInstanceData(filters: any, watcherType: string, queryParameter: string): Promise<WatcherEntry[]> {
    const { period, limit, offset, query } = filters;
    
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, queryParameter) : "";
    const watcherFilters = this.getWatcherSpecificFiltersSQL(watcherType, filters);

    try {
      const [results] = await this.storeConnection.query(
        `SELECT *
        FROM observatory_entries
        WHERE type = ?
        ${periodSql}
        ${querySql}
        ${watcherFilters}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
        [watcherType, limit, offset]
      ) as [QueryResult, FieldPacket[]];

      return results as unknown as WatcherEntry[];
    } catch (error) {
      console.log(error)
      throw error;
    }
  }

  async getIndexData(filters: any, watcherType: string, queryParameter: string) {
    const { period, limit, offset, query } = filters;
    
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, queryParameter) : "";
    const watcherFilters = this.getWatcherSpecificFiltersSQL(watcherType, filters);
    
    const { sql: groupMainKeySql, key: watcherKey } = this.getGroupMainKey(watcherType);

    try {
      const [results] = await this.storeConnection.query(
        `SELECT
        ${groupMainKeySql}
        COUNT(*) as total,
        ${this.getWatcherSpecificStatementsSQL(watcherType)}
        ${this.getDurationParametersSQL()}
        ${this.getP95SQL(watcherType)}
        FROM observatory_entries
        WHERE type = ? 
        ${periodSql} 
        ${querySql} 
        ${watcherFilters}
        GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.${watcherKey}'))
        ORDER BY total DESC
        LIMIT ? OFFSET ?`,
        [watcherType, limit, offset]
      ) as [QueryResult, FieldPacket[]];

      return results;
    } catch (error) {
      console.log(error)
      throw error;
    }
  }

  async getRelatedViewdata(conditions: string[], params: string[], type: string, extraCondition: string): Promise<WatcherEntry[]> {
    try {
      const [ relatedItems ] = await this.storeConnection.query(
        "SELECT * FROM observatory_entries WHERE " +
          conditions.join(" OR ") +
          " AND type != ? " +
          extraCondition,
        [...params, type],
      ) as [QueryResult, FieldPacket[]];
      
      return relatedItems as unknown as WatcherEntry[];
    } catch (error) {
      console.log(error)
      throw error;
    }
  }

  async getCountByType(watcherType: string, period?: string) {
    const periodSql = period ? this.getPeriodSQL(period) : "";

    try {
      const [results] = await this.storeConnection.query(
        `SELECT COUNT(*) as count
        FROM observatory_entries
        WHERE type = ?
        ${periodSql}`,
        [watcherType]
      ) as [QueryResult, FieldPacket[]];

      return Array.isArray(results) && results.length > 0 ? results[0] : { count: 0 };
    } catch (e) {
      console.error('getCountByType error:', e);
      throw e;
    }
  }

  async getEntriesCount(filters: any, watcherType: string, queryParameter: string, extraCondition: string) {
    const { period, query } = filters;

    const watcherFilters = this.getWatcherSpecificFiltersSQL(watcherType, filters);
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, queryParameter) : "";
    // const statusSql = this.getStatusSQL(status);

    try {
      const [countResult] = (await this.storeConnection.query(
        `SELECT COUNT(*) as total FROM observatory_entries WHERE type = ? ${periodSql} ${querySql} ${watcherFilters} ${extraCondition}`,
        [watcherType]
      )) as [QueryResult, FieldPacket[]];

      return countResult as QueryResult & { total: number }
    } catch (error) {
      console.log(error)
      throw error;
    }
  }

  async getEntriesCountByGroup(filters: any, watcherType: string, queryParameter: string, extraCondition: string) {
    const { period, query } = filters;

    const { sql: groupMainKeySql } = this.getGroupMainKey(watcherType);
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, queryParameter) : "";

    try {
      const [countResult] = (await this.storeConnection.query(
        `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.key'))) as total FROM observatory_entries WHERE type = ? ${periodSql} ${querySql} ${groupMainKeySql} ${extraCondition}`,
        [watcherType]
      )) as [QueryResult, FieldPacket[]];
      return countResult as QueryResult & { total: number }

    } catch (error) {
      console.log(error)
      throw error;
    }
  }

  async getGraphData(filters: any, watcherType: string, queryParameter: string, keys: string[]){
    const { period, key } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const keySql = key ? this.getEqualitySQL(key, "key") : "";

    try {
      const [results] = (await this.storeConnection.query(
        `(
          SELECT
            COUNT(*) as total,
            ${this.getDurationParametersSQL()}
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) > 0 THEN 1 ELSE 0 END) as misses,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) > 0 THEN 1 ELSE 0 END) as hits,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) > 0 THEN 1 ELSE 0 END) as writes,
            ${this.getP95SQL(watcherType)},
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

      const countFormattedData = formattCountGraphData(results as unknown as CacheContent[], period, keys);
      const durationFormattedData = formattDurationGraphData(results, period);

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
      console.log(error);
      throw error;
    }
  }
}

export default Database;