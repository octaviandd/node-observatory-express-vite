/**
 * JobWatcher Integration Tests
 * 
 * Entry structure matches bull-common.ts patcher output:
 * {
 *   status: 'completed' | 'failed',
 *   duration: number,
 *   metadata: { package: 'bull', method: string, queue: string, connectionName: string },
 *   data: { jobId?: string, attemptsMade?: number, failedReason?: string },
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

describe('JobWatcher Integration', () => {
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
   * Creates a job entry in the patcher format
   */
  const createJobEntry = (
    uuid: string,
    data: {
      jobId?: string;
      attemptsMade?: number;
      failedReason?: string;
    },
    options: {
      status?: 'completed' | 'failed';
      duration?: number;
      method?: string;
      queue?: string;
      connectionName?: string;
      request_id?: string;
      job_id?: string;
      schedule_id?: string;
      error?: { name: string; message: string };
    } = {}
  ) => ({
    uuid,
    type: 'job',
    content: {
      status: options.status || 'completed',
      duration: options.duration ?? 500,
      metadata: {
        package: 'bull' as const,
        method: options.method || 'processJob',
        queue: options.queue || 'email',
        connectionName: options.connectionName || 'localhost:6379',
      },
      data: {
        jobId: data.jobId,
        attemptsMade: data.attemptsMade ?? 1,
        failedReason: data.failedReason,
      },
      location: { file: 'jobs.ts', line: '30' },
      ...(options.error && { error: options.error }),
    },
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    request_id: options.request_id || 'null',
    job_id: options.job_id || data.jobId || 'null',
    schedule_id: options.schedule_id || 'null',
  });

  beforeAll(async () => {
    redisClient = await getRedisClient();
    mysqlConnection = await getMySQLConnection();
    database = new Database(mysqlConnection);
  });

  beforeEach(async () => {
    await resetAll();
    watcher = new GenericWatcher(redisClient as any, database, WATCHER_CONFIGS.job);
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

    it('should return job entries', async () => {
      await database.insert([
        createJobEntry('job:1', { jobId: 'job-1', attemptsMade: 1 }, { status: 'completed', duration: 500, queue: 'email', job_id: 'job-1' }),
        createJobEntry('job:2', { jobId: 'job-2', attemptsMade: 2, failedReason: 'Connection timeout' }, { status: 'failed', duration: 100, queue: 'email', job_id: 'job-2', error: { name: 'BullError', message: 'Connection timeout' } }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(2);
    });

    it('should group jobs by queue', async () => {
      await database.insert([
        createJobEntry('job:1', { jobId: 'job-1' }, { queue: 'email', job_id: 'job-1' }),
        createJobEntry('job:2', { jobId: 'job-2' }, { queue: 'email', job_id: 'job-2' }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(1);
    });

    it('should filter by job status', async () => {
      await database.insert([
        createJobEntry('job:completed', { jobId: 'job-1' }, { status: 'completed', job_id: 'job-1' }),
        createJobEntry('job:failed', { jobId: 'job-2', failedReason: 'Error' }, { status: 'failed', job_id: 'job-2', error: { name: 'Error', message: 'Failed' } }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h', status: 'completed' });
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
        createJobEntry('job:view-test', { jobId: 'job-view' }, { job_id: 'job-view' }),
      ]);

      const req = createMockRequest({}, { id: 'job:view-test' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('job');
    });

    it('should include related entries', async () => {
      const jobId = 'shared-job-id';
      await database.insert([
        createJobEntry('job:main', { jobId }, { job_id: jobId }),
        {
          uuid: 'log:related',
          type: 'log',
          content: {
            status: 'completed',
            duration: 0,
            metadata: { package: 'winston', level: 'info' },
            data: { message: 'Job started' },
            location: { file: 'jobs.ts', line: '35' },
          },
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          request_id: 'null',
          job_id: jobId,
          schedule_id: 'null',
        },
      ]);

      const req = createMockRequest({}, { id: 'job:main' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('job');
      expect(result.body).toHaveProperty('log');
    });
  });

  describe('insertRedisStream', () => {
    it('should add entry to Redis stream', async () => {
      const entry = {
        status: 'completed' as const,
        duration: 500,
        metadata: { package: 'bull' as const, method: 'processJob', queue: 'email', connectionName: 'localhost:6379' },
        data: { jobId: 'job-123', attemptsMade: 1 },
        location: { file: 'jobs.ts', line: '30' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:job');
      expect(streamLen).toBeGreaterThan(0);
    });

    it('should handle failed jobs with error', async () => {
      const entry = {
        status: 'failed' as const,
        duration: 100,
        metadata: { package: 'bull' as const, method: 'processJob', queue: 'email', connectionName: 'localhost:6379' },
        data: { jobId: 'job-456', attemptsMade: 3, failedReason: 'Max retries exceeded' },
        location: { file: 'jobs.ts', line: '30' },
        error: { name: 'BullError', message: 'Max retries exceeded' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:job');
      expect(streamLen).toBeGreaterThan(0);
    });
  });
});
