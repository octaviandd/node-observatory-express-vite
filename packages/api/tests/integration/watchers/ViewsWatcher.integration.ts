/**
 * ViewsWatcher Integration Tests
 * 
 * Entry structure matches express-common.ts render patcher output:
 * {
 *   status: 'completed' | 'failed',
 *   duration: number,
 *   metadata: { package: 'ejs' | 'pug' | 'handlebars', method: 'render' },
 *   data: {
 *     view: string,
 *     options?: any,
 *     size: number,
 *     cacheInfo?: { cacheEnabled: boolean }
 *   },
 *   location?: { file: string, line: string },
 *   error?: { name: string, message: string }
 * }
 */

import type { RedisClientType } from 'redis';
import Database from '../../../src/core/databases/sql/Base';
import GenericWatcher from '../../../src/core/watchers/GenericWatcher';
import { getRedisClient, getMySQLConnection, resetAll } from '../test-utils';
import type { Connection } from 'mysql2/promise';
import { WATCHER_CONFIGS } from '../../../src/core/watcherConfig';

describe('ViewsWatcher Integration', () => {
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
   * Creates a view entry in the patcher format
   */
  const createViewEntry = (
    uuid: string,
    data: {
      view: string;
      options?: any;
      size?: number;
      cacheInfo?: { cacheEnabled: boolean };
    },
    options: {
      status?: 'completed' | 'failed';
      duration?: number;
      package?: 'ejs' | 'pug' | 'handlebars';
      request_id?: string;
      job_id?: string;
      schedule_id?: string;
      error?: { name: string; message: string };
    } = {}
  ) => ({
    uuid,
    type: 'view',
    content: {
      status: options.status || 'completed',
      duration: options.duration ?? 50,
      metadata: {
        package: options.package || 'ejs',
        method: 'render',
      },
      data: {
        view: data.view,
        options: data.options,
        size: data.size ?? 2048,
        cacheInfo: data.cacheInfo || { cacheEnabled: false },
      },
      location: { file: 'express', line: '0' },
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
    watcher = new GenericWatcher(redisClient as any, database, WATCHER_CONFIGS.view);
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

    it('should return view entries', async () => {
      await database.insert([
        createViewEntry('view:1', { view: 'views/home.ejs', size: 2048 }, { duration: 50, request_id: 'req-1' }),
        createViewEntry('view:2', { view: 'views/profile.ejs', size: 3072 }, { duration: 80, request_id: 'req-2' }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(2);
    });

    it('should group by view path', async () => {
      await database.insert([
        createViewEntry('view:1', { view: 'views/home.ejs', size: 2048 }, { duration: 50 }),
        createViewEntry('view:2', { view: 'views/home.ejs', size: 2048 }, { duration: 60 }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(1);
    });

    it('should filter by status', async () => {
      await database.insert([
        createViewEntry('view:completed', { view: 'views/home.ejs', size: 2048 }, { status: 'completed' }),
        createViewEntry('view:failed', { view: 'views/broken.ejs', size: 0 }, { status: 'failed', error: { name: 'RenderError', message: 'Template syntax error' } }),
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
        createViewEntry('view:view-test', { view: 'views/home.ejs', size: 2048 }),
      ]);

      const req = createMockRequest({}, { id: 'view:view-test' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('view');
    });

    it('should include related request', async () => {
      const requestId = 'shared-request';
      await database.insert([
        createViewEntry('view:related', { view: 'views/home.ejs', size: 2048 }, { request_id: requestId }),
        {
          uuid: 'request:source',
          type: 'request',
          content: {
            status: 'completed',
            duration: 100,
            metadata: { package: 'express', method: 'get' },
            data: { route: '/', statusCode: 200, requestSize: 0, responseSize: 2048 },
            location: { file: 'express', line: '0' },
          },
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          request_id: requestId,
          job_id: 'null',
          schedule_id: 'null',
        },
      ]);

      const req = createMockRequest({}, { id: 'view:related' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('view');
      expect(result.body).toHaveProperty('request');
    });
  });

  describe('insertRedisStream', () => {
    it('should add entry to Redis stream', async () => {
      const entry = {
        status: 'completed' as const,
        duration: 50,
        metadata: { package: 'ejs' as const, method: 'render' },
        data: {
          view: 'views/home.ejs',
          size: 2048,
          cacheInfo: { cacheEnabled: false },
        },
        location: { file: 'express', line: '0' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:view');
      expect(streamLen).toBeGreaterThan(0);
    });

    it('should handle different template engines', async () => {
      const packages = ['ejs', 'pug', 'handlebars'] as const;
      
      for (const pkg of packages) {
        const entry = {
          status: 'completed' as const,
          duration: 50,
          metadata: { package: pkg, method: 'render' },
          data: {
            view: `views/home.${pkg === 'pug' ? 'pug' : pkg === 'handlebars' ? 'hbs' : 'ejs'}`,
            size: 2048,
          },
          location: { file: 'express', line: '0' },
        };

        await watcher.insertRedisStream(entry as any);
      }

      const streamLen = await redisClient.xLen('observatory:stream:view');
      expect(streamLen).toBe(3);
    });

    it('should handle failed renders with error', async () => {
      const entry = {
        status: 'failed' as const,
        duration: 10,
        metadata: { package: 'ejs' as const, method: 'render' },
        data: {
          view: 'views/broken.ejs',
          size: 0,
        },
        location: { file: 'express', line: '0' },
        error: { name: 'RenderError', message: 'Template syntax error' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:view');
      expect(streamLen).toBeGreaterThan(0);
    });
  });
});
