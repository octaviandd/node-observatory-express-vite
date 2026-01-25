/**
 * CacheWatcher Integration Tests
 * 
 * Entry structure matches redis-common.ts patcher output:
 * {
 *   status: 'completed' | 'failed',
 *   duration: number,
 *   metadata: { package: 'redis', command: string },
 *   data: { key?: string, hits?: number, misses?: number, writes?: number },
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

describe('CacheWatcher Integration', () => {
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
   * Creates a cache entry in the patcher format
   */
  const createCacheEntry = (
    uuid: string,
    data: { key?: string; hits?: number; misses?: number; writes?: number },
    options: {
      status?: 'completed' | 'failed';
      duration?: number;
      command?: string;
      request_id?: string;
      job_id?: string;
      schedule_id?: string;
      error?: { name: string; message: string; stack?: string };
    } = {}
  ) => ({
    uuid,
    type: 'cache',
    content: {
      status: options.status || 'completed',
      duration: options.duration ?? 50,
      metadata: { package: 'redis' as const, command: options.command || 'get' },
      data,
      location: { file: 'test.ts', line: '10' },
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
    watcher = new GenericWatcher(redisClient as any, database, WATCHER_CONFIGS.cache);
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
        createCacheEntry('cache:1', { key: 'user:1', hits: 10, misses: 2, writes: 5 }, { duration: 50 }),
        createCacheEntry('cache:2', { key: 'user:2', hits: 5, misses: 1, writes: 3 }, { duration: 30 }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(2);
      expect(result.body.count).toBe('2');
    });

    it('should return grouped data by cache key', async () => {
      await database.insert([
        createCacheEntry('cache:1', { key: 'user:1', hits: 1, misses: 0, writes: 0 }, { duration: 10 }),
        createCacheEntry('cache:2', { key: 'user:1', hits: 1, misses: 0, writes: 0 }, { duration: 20 }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(1);
    });

    it('should return graph data when isTable is false', async () => {
      const req = createMockRequest({ table: 'false', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('countFormattedData');
      expect(result.body).toHaveProperty('count');
    });

    it('should filter by cache type', async () => {
      await database.insert([
        createCacheEntry('cache:hit', { key: 'test', hits: 1, misses: 0, writes: 0 }, { duration: 10 }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h', status: 'hits' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
    });
  });

  describe('view endpoint', () => {
    it('should return entry data by uuid', async () => {
      await database.insert([
        createCacheEntry('cache:view-test', { key: 'user:1', hits: 1 }, { duration: 50 }),
      ]);

      const req = createMockRequest({}, { id: 'cache:view-test' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('cache');
    });

    it('should include related entries when request_id exists', async () => {
      const requestId = 'shared-req';
      await database.insert([
        createCacheEntry('cache:related', { key: 'user:1', hits: 1 }, { duration: 50, request_id: requestId }),
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

      const req = createMockRequest({}, { id: 'cache:related' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('cache');
      expect(result.body).toHaveProperty('request');
    });
  });

  describe('insertRedisStream', () => {
    it('should add entry to Redis stream', async () => {
      const entry = {
        status: 'completed' as const,
        duration: 50,
        metadata: { package: 'redis' as const, command: 'get' },
        data: { key: 'user:1', hits: 1, misses: 0, writes: 0 },
        location: { file: 'test.ts', line: '10' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:cache');
      expect(streamLen).toBeGreaterThan(0);
    });

    it('should handle failed entries with error', async () => {
      const entry = {
        status: 'failed' as const,
        duration: 10,
        metadata: { package: 'redis' as const, command: 'get' },
        data: { key: 'invalid:key' },
        location: { file: 'test.ts', line: '15' },
        error: { name: 'RedisError', message: 'Connection refused', stack: 'Error...' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:cache');
      expect(streamLen).toBeGreaterThan(0);
    });
  });
});
