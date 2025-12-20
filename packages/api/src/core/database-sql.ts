import { Connection, FieldPacket, QueryResult } from "mysql2/promise";
import { PERIODS } from "./helpers/constants";
import { formattCountGraphData, formattDurationGraphData, formatValue } from "./helpers/helpers";

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

  // Insert, update, delete

  async insert(redisEntry: any) {
    try {
      await this.storeConnection.query("START TRANSACTION");
      await this.storeConnection.query(
        "INSERT INTO observatory_entries (uuid, request_id, job_id, schedule_id, type, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          redisEntry.uuid,
          redisEntry.request_id,
          redisEntry.job_id,
          redisEntry.schedule_id,
          redisEntry.type,
          redisEntry.content,
          redisEntry.created_at,
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

  // Get entry/entries

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

  // Basic Helpers

  private getStatusSQL = (status: string): string => status === 'all' ? "" : `AND JSON_EXTRACT(content, '$.statusCode') LIKE '${status.replace("xx", "%")}'`;
  private getPeriodSQL = (period: string): string => period ? `AND created_at >= UTC_TIMESTAMP() - ${PERIODS[period].interval}` : '';
  private getEqualitySQL = (value: string, type: string): string => value ? `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.${type}')) = '${value}'` : '';
  private getInclusionSQL = (value: string, type: string): string => value ? `AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(content, '$.${type}'))) LIKE '%${value.toLowerCase()}%'` : "";

  private getDurationParametersSQL = (): string => {
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
      'http': { 
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

  private getP95SQL(watcherType: string): string {
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

  private getWatcherSpecificStatementsSQL(watcherType: string): string {
    let statement = ''
    if (watcherType === 'cache') {
      statement = `
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) > 0 THEN 1 ELSE 0 END) as misses,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) > 0 THEN 1 ELSE 0 END) as hits,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) > 0 THEN 1 ELSE 0 END) as writes,
      `
    } else if (watcherType === 'exception') {
      statement = `
        SUM(CASE WHEN JSON_EXTRACT(content, '$.type') = 'unhandledRejection' THEN 1 ELSE 0 END) as unhandledRejection,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.type') = 'uncaughtException' THEN 1 ELSE 0 END) as uncaughtException,
      `
    } else if (watcherType === 'http') {
      
    } else if (watcherType === 'log') {
      statement = `
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'info' THEN 1 ELSE 0 END) as info,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'warn' THEN 1 ELSE 0 END) as warn,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'error' THEN 1 ELSE 0 END) as error,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'debug' THEN 1 ELSE 0 END) as debug,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'trace' THEN 1 ELSE 0 END) as trace,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'fatal' THEN 1 ELSE 0 END) as fatal,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'log' THEN 1 ELSE 0 END) as log,
      `;
    } else if (watcherType === 'mail') {
      statement = `
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed_count,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as success_count,
      `;
    } else if (watcherType === 'model') {
      statement = `
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as count_completed,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as count_failed,
      `;
    } else if (watcherType === 'query') {
      statement = `
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed,
      `;
    } else if (watcherType === 'notification') {
      statement = `
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed,
      `;
    } else if (watcherType === 'request') {
      statement = `
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '2%' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '3%' THEN 1 ELSE 0 END) as count_200,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '4%' THEN 1 ELSE 0 END) as count_400,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '5%' THEN 1 ELSE 0 END) as count_500,
      `;
    } else if (watcherType === 'schedule') {
      statement = `
        GROUP_CONCAT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.cronExpression'))) AS cronExpression,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed,
      `;
    } else if (watcherType === 'view') {
      statement = `
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed,
        CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.size')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as size,
      `;
    }

    return statement
  }

  

  private getWatcherSpecificFiltersSQL(watcherType: string, filters: any): string {
    let conditions: string[] = [];

    switch (watcherType) {
      case 'cache':
        conditions =
          [
            ...(filters.cacheType && filters.cacheType !== 'all') && `JSON_UNQUOTE(JSON_EXTRACT(content, '$.${filters.cacheType}')) IS NOT NULL`,
            ...(filters.key && this.getEqualitySQL(filters.key, 'key'))
          ];
        break;
      
      case 'exception':
        conditions =
          [
            ...(filters.type && filters.type !== 'all') && this.getEqualitySQL(filters.type, 'type'),
            ...(filters.key && this.getInclusionSQL(filters.key, 'message'))
          ];
        break;

      case 'request':
        conditions.push("JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'");
        
        if (filters.status && filters.status !== 'all') {
          const statusPrefix = filters.status.charAt(0); // '2xx' -> '2'
          conditions.push(`JSON_EXTRACT(content, '$.statusCode') LIKE '${statusPrefix}%'`);
        }
        if (filters.key) {
          conditions.push(this.getEqualitySQL(filters.key, 'route'));
        }
        break;
      
      case 'http-client':
        if (filters.status && filters.status !== 'all') {
          const statusCode = filters.status.charAt(0);
          conditions.push(`JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '${statusCode}%'`);
        }
        if (filters.key) {
          conditions.push(this.getEqualitySQL(filters.key, 'origin'));
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
          conditions.push(`JSON_UNQUOTE(JSON_EXTRACT(content, '$.type')) = 'processJob'`);
          conditions.push(`JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = '${filters.status}'`);
        } else {
          conditions.push(`JSON_UNQUOTE(JSON_EXTRACT(content, '$.type')) = 'processJob'`);
        }
        if (filters.key) {
          conditions.push(this.getEqualitySQL(filters.key, 'scheduleId'));
        }
        break;
    
      case 'notification':
        conditions.push("JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) != 'pending'");
        
        if (filters.status && filters.status !== 'all') {
          conditions.push(`JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = '${filters.status}'`);
        }
        if (filters.channel) {
          conditions.push(this.getEqualitySQL(filters.channel, 'channel'));
        }
        break;

      case 'query':
        if (filters.status && filters.status !== 'all') {
          const statusMap: Record<string, string> = {
            'select': "JSON_UNQUOTE(JSON_EXTRACT(content, '$.sql')) LIKE '%SELECT%'",
            'insert': "JSON_UNQUOTE(JSON_EXTRACT(content, '$.sql')) LIKE '%INSERT%'",
            'update': "JSON_UNQUOTE(JSON_EXTRACT(content, '$.sql')) LIKE '%UPDATE%'",
            'delete': "JSON_UNQUOTE(JSON_EXTRACT(content, '$.sql')) LIKE '%DELETE%'"
          };
          if (statusMap[filters.status]) {
            conditions.push(statusMap[filters.status]);
          }
        }
        if (filters.key) {
          conditions.push(this.getEqualitySQL(filters.key, 'sql'));
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

  async getInstanceData(filters: any, watcherType: string): Promise<WatcherEntry[]> {
    const { period, limit, offset, query } = filters;
    
    const periodSql = this.getPeriodSQL(period);
    const querySql = this.getInclusionSQL(query, "key");
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

  async getIndexData(filters: any, watcherType: string) {
    const { period, limit, offset, query } = filters;
    
    const periodSql = this.getPeriodSQL(period);
    const querySql = this.getInclusionSQL(query, "key");
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

  async getCountByType(watcherType: string, period: string) {
    const periodSql = this.getPeriodSQL(period);

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

  async getEntriesCount(filters: any, watcherType: string, extraCondition?: string) {
    const { period, query } = filters;

    const watcherFilters = this.getWatcherSpecificFiltersSQL(watcherType, filters);
    const periodSql = this.getPeriodSQL(period);
    const querySql = this.getInclusionSQL(query, "key");
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

  async getEntriesCountByGroup(filters: any, watcherType: string, extraCondition?: string) {
    const { period, query } = filters;

    const { sql: groupMainKeySql } = this.getGroupMainKey(watcherType);
    const periodSql = this.getPeriodSQL(period);
    const querySql = this.getInclusionSQL(query, "key");

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

  async getGraphData(filters: any, watcherType: string, keys: string[], hasDuration?: boolean){
    const { period, key } = filters;
    const periodSql = this.getPeriodSQL(period);
    const keySql = this.getEqualitySQL(key, "key");

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
      const durationFormattedData = hasDuration && formattDurationGraphData(results, period);

      return {
        countFormattedData,
        ...(hasDuration ? durationFormattedData : {}),
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