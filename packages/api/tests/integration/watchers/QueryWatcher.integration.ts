/**
 * QueryWatcher Integration Tests
 * 
 * Entry structure matches mysql2-common.ts / pg-common.ts patcher output:
 * {
 *   status: 'completed' | 'failed',
 *   duration: number,
 *   metadata: { package: 'mysql2' | 'pg', method: string },
 *   data: { sql: string, values?: any[], database?: string },
 *   location?: { file: string, line: string },
 *   error?: { name: string, message: string, stack?: string }
 * }
 */

import type { RedisClientType } from 'redis';
import Database from '../../../src/core/databases/sql/Base';
import GenericWatcher from '../../../src/core/watchers/GenericWatcher';
import { getRedisClient, getMySQLConnection, resetAll } from '../test-utils';
import type { Connection } from 'mysql2/promise';
import { WATCHER_CONFIGS } from '../../../src/core/watcherConfig';

describe('QueryWatcher Integration', () => {
  let redisClient: RedisClientType;
  let mysqlConnection: Connection;
  let database: Database;
  let watcher: GenericWatcher;

  const createMockRequest = (
    query: Record<string, string> = {},
    params: Record<string, string> = {}
  ): ObservatoryBoardRequest => ({
    query,
    params,
    body: {},
    requestData: {},
  } as unknown as ObservatoryBoardRequest);

  /**
   * Creates a query entry in the patcher format
   */
  const createQueryEntry = (
    uuid: string,
    data: {
      sql: string;
      values?: any[];
      database?: string;
    },
    options: {
      status?: 'completed' | 'failed';
      duration?: number;
      method?: string;
      package?: 'mysql2' | 'pg';
      request_id?: string;
      job_id?: string;
      schedule_id?: string;
      error?: { name: string; message: string; stack?: string };
    } = {}
  ) => ({
    uuid,
    type: 'query',
    content: {
      status: options.status || 'completed',
      duration: options.duration ?? 50,
      metadata: {
        package: options.package || 'mysql2',
        method: options.method || 'query',
      },
      data: {
        sql: data.sql,
        values: data.values,
        database: data.database || 'test_db',
      },
      location: { file: 'db.ts', line: '15' },
      ...(options.error && { error: options.error }),
    },
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    request_id: options.request_id || 'null',
    job_id: options.job_id || 'null',
    schedule_id: options.schedule_id || 'null',
  });

  beforeAll(async () => {
    redisClient = await getRedisClient();
    mysqlConnection = await getMySQLConnection();
    database = new Database(mysqlConnection);
  });

  beforeEach(async () => {
    await resetAll();
    watcher = new GenericWatcher(redisClient as any, database, WATCHER_CONFIGS.query);
  });

  afterEach(() => {
    watcher.stop();
  });

  describe('index endpoint', () => {
    it('should return empty results when no data exists', async () => {
      const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toEqual([]);
      expect(result.body.count).toBe('0');
    });

    it('should return query entries', async () => {
      await database.insert([
        createQueryEntry('query:1', { sql: 'SELECT * FROM users WHERE id = ?', values: [1] }, { duration: 50, request_id: 'req-1' }),
        createQueryEntry('query:2', { sql: 'INSERT INTO logs VALUES (?)', values: ['test'] }, { duration: 30, request_id: 'req-2' }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(2);
    });

    it('should group queries by SQL pattern', async () => {
      await database.insert([
        createQueryEntry('query:1', { sql: 'SELECT * FROM users' }, { duration: 50 }),
        createQueryEntry('query:2', { sql: 'SELECT * FROM users' }, { duration: 60 }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(1);
    });

    it('should filter by query type', async () => {
      await database.insert([
        createQueryEntry('query:select', { sql: 'SELECT * FROM users' }, { duration: 50 }),
        createQueryEntry('query:insert', { sql: 'INSERT INTO logs VALUES (?)' }, { duration: 30 }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h', status: 'select' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
    });

    it('should return graph data when isTable is false', async () => {
      const req = createMockRequest({ table: 'false', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('countFormattedData');
    });
  });

  describe('view endpoint', () => {
    it('should return entry data by uuid', async () => {
      await database.insert([
        createQueryEntry('query:view-test', { sql: 'SELECT * FROM users' }, { duration: 50 }),
      ]);

      const req = createMockRequest({}, { id: 'query:view-test' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('query');
    });

    it('should include related request', async () => {
      const requestId = 'shared-request';
      await database.insert([
        createQueryEntry('query:related', { sql: 'SELECT * FROM users' }, { duration: 50, request_id: requestId }),
        {
          uuid: 'request:source',
          type: 'request',
          content: {
            status: 'completed',
            duration: 100,
            metadata: { package: 'express', method: 'get' },
            data: { route: '/api/users', statusCode: 200, requestSize: 0, responseSize: 100 },
            location: { file: 'express', line: '0' },
          },
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          request_id: requestId,
          job_id: 'null',
          schedule_id: 'null',
        },
      ]);

      const req = createMockRequest({}, { id: 'query:related' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('query');
      expect(result.body).toHaveProperty('request');
    });
  });

  describe('insertRedisStream', () => {
    it('should add entry to Redis stream', async () => {
      const entry = {
        status: 'completed' as const,
        duration: 50,
        metadata: { package: 'mysql2' as const, method: 'query' },
        data: { sql: 'SELECT * FROM users', values: [], database: 'test_db' },
        location: { file: 'db.ts', line: '15' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:query');
      expect(streamLen).toBeGreaterThan(0);
    });

    it('should handle failed queries with error', async () => {
      const entry = {
        status: 'failed' as const,
        duration: 10,
        metadata: { package: 'mysql2' as const, method: 'query' },
        data: { sql: 'SELECT * FROM nonexistent', database: 'test_db' },
        location: { file: 'db.ts', line: '20' },
        error: { name: 'QueryError', message: "Table 'nonexistent' doesn't exist", stack: 'Error...' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:query');
      expect(streamLen).toBeGreaterThan(0);
    });

    it('should handle different database packages', async () => {
      const packages = ['mysql2', 'pg'] as const;
      
      for (const pkg of packages) {
        const entry = {
          status: 'completed' as const,
          duration: 50,
          metadata: { package: pkg, method: 'query' },
          data: { sql: 'SELECT 1', database: 'test_db' },
          location: { file: 'db.ts', line: '15' },
        };

        await watcher.insertRedisStream(entry as any);
      }

      const streamLen = await redisClient.xLen('observatory:stream:query');
      expect(streamLen).toBe(2);
    });
  });
});
