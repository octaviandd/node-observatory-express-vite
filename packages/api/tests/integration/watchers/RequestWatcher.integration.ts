/**
 * RequestWatcher Integration Tests
 * 
 * Entry structure matches express-common.ts patcher output:
 * {
 *   status: 'completed' | 'failed',
 *   duration: number,
 *   metadata: { package: 'express', method: string },
 *   data: {
 *     route: string,
 *     statusCode: number,
 *     requestSize: number,
 *     responseSize: number,
 *     payload?: string,
 *     headers?: Record<string, any>,
 *     query?: Record<string, any>,
 *     params?: Record<string, any>,
 *     ip?: string,
 *     memoryUsage?: NodeJS.MemoryUsage,
 *     session?: Record<string, any>,
 *   },
 *   location?: { file: string, line: string },
 *   error?: { message: string, name: string, stack?: string }
 * }
 */

import type { RedisClientType } from 'redis';
import Database from '../../../src/core/database-sql';
import RequestWatcher from '../../../src/core/watchers/RequestWatcher';
import { getRedisClient, getMySQLConnection, resetAll } from '../test-utils';
import type { Connection } from 'mysql2/promise';

describe('RequestWatcher Integration', () => {
  let redisClient: RedisClientType;
  let mysqlConnection: Connection;
  let database: Database;
  let watcher: RequestWatcher;

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
   * Creates a request entry in the patcher format
   */
  const createRequestEntry = (
    uuid: string,
    data: {
      route: string;
      statusCode: number;
      requestSize?: number;
      responseSize?: number;
      payload?: string;
      headers?: Record<string, any>;
      query?: Record<string, any>;
      params?: Record<string, any>;
      ip?: string;
    },
    options: {
      status?: 'completed' | 'failed';
      duration?: number;
      method?: string;
      request_id?: string;
      job_id?: string;
      schedule_id?: string;
      error?: { message: string; name: string; stack?: string };
    } = {}
  ) => ({
    uuid,
    type: 'request',
    content: {
      status: options.status || (data.statusCode >= 400 ? 'failed' : 'completed'),
      duration: options.duration ?? 100,
      metadata: { package: 'express' as const, method: options.method || 'get' },
      data: {
        route: data.route,
        statusCode: data.statusCode,
        requestSize: data.requestSize ?? 0,
        responseSize: data.responseSize ?? 100,
        payload: data.payload || '',
        headers: data.headers || {},
        query: data.query || {},
        params: data.params || {},
        ip: data.ip || '127.0.0.1',
      },
      location: { file: 'express', line: '0' },
      ...(options.error && { error: options.error }),
    },
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    request_id: options.request_id || uuid.replace('request:', 'req-'),
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
    watcher = new RequestWatcher(redisClient as any, database);
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

    it('should return instance data when entries exist', async () => {
      await database.insert([
        createRequestEntry('request:1', { route: '/api/users', statusCode: 200 }, { duration: 100, method: 'get' }),
        createRequestEntry('request:2', { route: '/api/posts', statusCode: 201 }, { duration: 150, method: 'post' }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(2);
      expect(result.body.count).toBe('2');
    });

    it('should return grouped data by route', async () => {
      await database.insert([
        createRequestEntry('request:1', { route: '/api/users', statusCode: 200 }, { duration: 100 }),
        createRequestEntry('request:2', { route: '/api/users', statusCode: 200 }, { duration: 120 }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(1);
    });

    it('should filter by status code', async () => {
      await database.insert([
        createRequestEntry('request:200', { route: '/api/users', statusCode: 200 }, { duration: 100 }),
        createRequestEntry('request:404', { route: '/api/missing', statusCode: 404 }, { duration: 50 }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h', status: '2xx' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
    });

    it('should return graph data when isTable is false', async () => {
      const req = createMockRequest({ table: 'false', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('countFormattedData');
      expect(result.body).toHaveProperty('durationFormattedData');
    });

    it('should handle pagination', async () => {
      const entries = Array.from({ length: 10 }, (_, i) =>
        createRequestEntry(`request:${i}`, { route: `/api/item/${i}`, statusCode: 200 }, { duration: 100 })
      );
      await database.insert(entries);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h', limit: '3', offset: '2' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(3);
      expect(result.body.count).toBe('10');
    });
  });

  describe('view endpoint', () => {
    it('should return entry data by uuid', async () => {
      await database.insert([
        createRequestEntry('request:view-test', { route: '/api/users', statusCode: 200 }, { duration: 100, request_id: 'req-view' }),
      ]);

      const req = createMockRequest({}, { id: 'request:view-test' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('request');
    });

    it('should include related entries', async () => {
      const requestId = 'shared-req-uuid';
      await database.insert([
        createRequestEntry('request:main', { route: '/api/users', statusCode: 200 }, { duration: 100, request_id: requestId }),
        {
          uuid: 'log:related',
          type: 'log',
          content: {
            status: 'completed',
            duration: 0,
            metadata: { package: 'winston', level: 'info' },
            data: { message: 'User fetched' },
            location: { file: 'app.ts', line: '50' },
          },
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          request_id: requestId,
          job_id: 'null',
          schedule_id: 'null',
        },
        {
          uuid: 'query:related',
          type: 'query',
          content: {
            status: 'completed',
            duration: 50,
            metadata: { package: 'mysql2', method: 'query' },
            data: { sql: 'SELECT * FROM users' },
            location: { file: 'db.ts', line: '20' },
          },
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          request_id: requestId,
          job_id: 'null',
          schedule_id: 'null',
        },
      ]);

      const req = createMockRequest({}, { id: 'request:main' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('request');
      expect(result.body).toHaveProperty('log');
      expect(result.body).toHaveProperty('query');
    });
  });

  describe('insertRedisStream', () => {
    it('should add entry to Redis stream', async () => {
      const entry = {
        status: 'completed' as const,
        duration: 100,
        metadata: { package: 'express' as const, method: 'get' },
        data: {
          route: '/api/users',
          statusCode: 200,
          requestSize: 0,
          responseSize: 256,
          payload: '',
          headers: { 'content-type': 'application/json' },
          query: {},
          params: {},
          ip: '127.0.0.1',
        },
        location: { file: 'express', line: '0' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:request');
      expect(streamLen).toBeGreaterThan(0);
    });

    it('should handle failed requests with error', async () => {
      const entry = {
        status: 'failed' as const,
        duration: 50,
        metadata: { package: 'express' as const, method: 'get' },
        data: {
          route: '/api/error',
          statusCode: 500,
          requestSize: 0,
          responseSize: 0,
        },
        location: { file: 'express', line: '0' },
        error: { name: 'InternalError', message: 'Something went wrong', stack: 'Error...' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:request');
      expect(streamLen).toBeGreaterThan(0);
    });
  });
});
