/**
 * LogWatcher Integration Tests
 * 
 * Entry structure matches winston-common.ts patcher output:
 * {
 *   status: 'completed',
 *   duration: number,
 *   metadata: { package: 'winston', level: string },
 *   data: { message: any },
 *   location?: { file: string, line: string }
 * }
 */

import type { RedisClientType } from 'redis';
import Database from '../../../src/core/databases/sql/Base';
import GenericWatcher from '../../../src/core/watchers/GenericWatcher';
import { getRedisClient, getMySQLConnection, resetAll } from '../test-utils';
import type { Connection } from 'mysql2/promise';
import { WATCHER_CONFIGS } from '../../../src/core/watcherConfig';

describe('LogWatcher Integration', () => {
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
   * Creates a log entry in the patcher format
   */
  const createLogEntry = (
    uuid: string,
    data: { message: any },
    options: {
      level?: string;
      duration?: number;
      request_id?: string;
      job_id?: string;
      schedule_id?: string;
    } = {}
  ) => ({
    uuid,
    type: 'log',
    content: {
      status: 'completed' as const,
      duration: options.duration ?? 0,
      metadata: { package: 'winston' as const, level: options.level || 'info' },
      data,
      location: { file: 'app.ts', line: '50' },
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
    watcher = new GenericWatcher(redisClient as any, database, WATCHER_CONFIGS.log);
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

    it('should return log entries', async () => {
      await database.insert([
        createLogEntry('log:1', { message: 'Test info message' }, { level: 'info' }),
        createLogEntry('log:2', { message: 'Test warn message' }, { level: 'warn' }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(2);
    });

    it('should group logs by message', async () => {
      await database.insert([
        createLogEntry('log:1', { message: 'Same message' }, { level: 'info' }),
        createLogEntry('log:2', { message: 'Same message' }, { level: 'warn' }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(1);
    });

    it('should filter by log level', async () => {
      await database.insert([
        createLogEntry('log:info', { message: 'Info message' }, { level: 'info' }),
        createLogEntry('log:error', { message: 'Error message' }, { level: 'error' }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h', status: 'Error' });
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
        createLogEntry('log:view-test', { message: 'Test log' }, { level: 'info' }),
      ]);

      const req = createMockRequest({}, { id: 'log:view-test' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('log');
    });

    it('should include related entries when request_id exists', async () => {
      const requestId = 'shared-req';
      await database.insert([
        createLogEntry('log:main', { message: 'Processing request' }, { level: 'info', request_id: requestId }),
        {
          uuid: 'request:source',
          type: 'request',
          content: {
            status: 'completed',
            duration: 100,
            metadata: { package: 'express', method: 'get' },
            data: { route: '/api/data', statusCode: 200, requestSize: 0, responseSize: 100 },
            location: { file: 'express', line: '0' },
          },
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          request_id: requestId,
          job_id: 'null',
          schedule_id: 'null',
        },
      ]);

      const req = createMockRequest({}, { id: 'log:main' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('log');
      expect(result.body).toHaveProperty('request');
    });
  });

  describe('insertRedisStream', () => {
    it('should add entry to Redis stream', async () => {
      const entry = {
        status: 'completed' as const,
        duration: 0,
        metadata: { package: 'winston' as const, level: 'info' },
        data: { message: 'Test log message' },
        location: { file: 'app.ts', line: '50' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:log');
      expect(streamLen).toBeGreaterThan(0);
    });

    it('should handle different log levels', async () => {
      const levels = ['info', 'warn', 'error', 'debug', 'verbose'];
      
      for (const level of levels) {
        const entry = {
          status: 'completed' as const,
          duration: 0,
          metadata: { package: 'winston' as const, level },
          data: { message: `Test ${level} message` },
          location: { file: 'app.ts', line: '50' },
        };

        await watcher.insertRedisStream(entry as any);
      }

      const streamLen = await redisClient.xLen('observatory:stream:log');
      expect(streamLen).toBe(5);
    });
  });
});
