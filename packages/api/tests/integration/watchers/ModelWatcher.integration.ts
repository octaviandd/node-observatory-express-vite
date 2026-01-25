/**
 * ModelWatcher Integration Tests
 * 
 * Entry structure for model operations:
 * {
 *   status: 'completed' | 'failed',
 *   duration: number,
 *   metadata: { package: 'sequelize' | 'mongoose' | 'typeorm', method: string },
 *   data: {
 *     modelName: string,
 *     method: string,
 *     options?: any
 *   },
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

describe('ModelWatcher Integration', () => {
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
   * Creates a model entry in the patcher format
   */
  const createModelEntry = (
    uuid: string,
    data: {
      modelName: string;
      method: string;
      options?: any;
    },
    options: {
      status?: 'completed' | 'failed';
      duration?: number;
      package?: 'sequelize' | 'mongoose' | 'typeorm';
      request_id?: string;
      job_id?: string;
      schedule_id?: string;
      error?: { name: string; message: string; stack?: string };
    } = {}
  ) => ({
    uuid,
    type: 'model',
    content: {
      status: options.status || 'completed',
      duration: options.duration ?? 100,
      metadata: {
        package: options.package || 'sequelize',
        method: data.method,
      },
      data: {
        modelName: data.modelName,
        method: data.method,
        options: data.options,
      },
      location: { file: 'models.ts', line: '50' },
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
    watcher = new GenericWatcher(redisClient as any, database, WATCHER_CONFIGS.model);
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

    it('should return model entries', async () => {
      await database.insert([
        createModelEntry('model:1', { modelName: 'User', method: 'findAll' }, { duration: 100, request_id: 'req-1' }),
        createModelEntry('model:2', { modelName: 'Post', method: 'create' }, { duration: 50, request_id: 'req-2' }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(2);
    });

    it('should group by model name', async () => {
      await database.insert([
        createModelEntry('model:1', { modelName: 'User', method: 'findAll' }, { duration: 100 }),
        createModelEntry('model:2', { modelName: 'User', method: 'findById' }, { duration: 50 }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(1);
    });

    it('should filter by model name', async () => {
      await database.insert([
        createModelEntry('model:user', { modelName: 'User', method: 'findAll' }),
        createModelEntry('model:post', { modelName: 'Post', method: 'findAll' }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h', model: 'User' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
    });

    it('should filter by status', async () => {
      await database.insert([
        createModelEntry('model:completed', { modelName: 'User', method: 'findAll' }, { status: 'completed' }),
        createModelEntry('model:failed', { modelName: 'User', method: 'create' }, { status: 'failed', error: { name: 'ValidationError', message: 'Invalid data' } }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h', status: 'failed' });
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
        createModelEntry('model:view-test', { modelName: 'User', method: 'findAll' }),
      ]);

      const req = createMockRequest({}, { id: 'model:view-test' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('model');
    });

    it('should include related request', async () => {
      const requestId = 'shared-request';
      await database.insert([
        createModelEntry('model:related', { modelName: 'User', method: 'findAll' }, { request_id: requestId }),
        {
          uuid: 'request:source',
          type: 'request',
          content: {
            status: 'completed',
            duration: 150,
            metadata: { package: 'express', method: 'get' },
            data: { route: '/api/users', statusCode: 200, requestSize: 0, responseSize: 500 },
            location: { file: 'express', line: '0' },
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
            data: { sql: 'SELECT * FROM users', database: 'app_db' },
            location: { file: 'db.ts', line: '20' },
          },
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          request_id: requestId,
          job_id: 'null',
          schedule_id: 'null',
        },
      ]);

      const req = createMockRequest({}, { id: 'model:related' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('model');
      expect(result.body).toHaveProperty('request');
      expect(result.body).toHaveProperty('query');
    });
  });

  describe('insertRedisStream', () => {
    it('should add entry to Redis stream', async () => {
      const entry = {
        status: 'completed' as const,
        duration: 100,
        metadata: { package: 'sequelize' as const, method: 'findAll' },
        data: { modelName: 'User', method: 'findAll' },
        location: { file: 'models.ts', line: '50' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:model');
      expect(streamLen).toBeGreaterThan(0);
    });

    it('should handle different ORM packages', async () => {
      const packages = ['sequelize', 'mongoose', 'typeorm'] as const;
      
      for (const pkg of packages) {
        const entry = {
          status: 'completed' as const,
          duration: 100,
          metadata: { package: pkg, method: 'findAll' },
          data: { modelName: 'User', method: 'findAll' },
          location: { file: 'models.ts', line: '50' },
        };

        await watcher.insertRedisStream(entry as any);
      }

      const streamLen = await redisClient.xLen('observatory:stream:model');
      expect(streamLen).toBe(3);
    });

    it('should handle failed operations with error', async () => {
      const entry = {
        status: 'failed' as const,
        duration: 10,
        metadata: { package: 'sequelize' as const, method: 'create' },
        data: { modelName: 'User', method: 'create' },
        location: { file: 'models.ts', line: '55' },
        error: { name: 'SequelizeValidationError', message: 'email must be unique', stack: 'Error...' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:model');
      expect(streamLen).toBeGreaterThan(0);
    });
  });
});
