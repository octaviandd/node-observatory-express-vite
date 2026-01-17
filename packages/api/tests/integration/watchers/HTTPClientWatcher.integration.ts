/**
 * HTTPClientWatcher Integration Tests
 * 
 * Entry structure matches http-common.ts / axios-common.ts patcher output:
 * {
 *   status: 'completed' | 'failed',
 *   duration: number,
 *   metadata: { package: 'axios' | 'fetch' | 'http', method: string },
 *   data: {
 *     origin: string,
 *     pathname: string,
 *     method: string,
 *     statusCode: number,
 *     statusMessage?: string,
 *     headers?: Record<string, any>,
 *     responseBody?: string,
 *     responseBodySize?: number
 *   },
 *   location?: { file: string, line: string },
 *   error?: { name: string, message: string, stack?: string }
 * }
 */

import type { RedisClientType } from 'redis';
import Database from '../../../src/core/database-sql';
import HTTPClientWatcher from '../../../src/core/watchers/HTTPClientWatcher';
import { getRedisClient, getMySQLConnection, resetAll } from '../test-utils';
import type { Connection } from 'mysql2/promise';

describe('HTTPClientWatcher Integration', () => {
  let redisClient: RedisClientType;
  let mysqlConnection: Connection;
  let database: Database;
  let watcher: HTTPClientWatcher;

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
   * Creates an HTTP client entry in the patcher format
   */
  const createHTTPClientEntry = (
    uuid: string,
    data: {
      origin: string;
      pathname?: string;
      method?: string;
      statusCode: number;
      statusMessage?: string;
      headers?: Record<string, any>;
      responseBody?: string;
      responseBodySize?: number;
    },
    options: {
      status?: 'completed' | 'failed';
      duration?: number;
      package?: 'axios' | 'fetch' | 'http';
      request_id?: string;
      job_id?: string;
      schedule_id?: string;
      error?: { name: string; message: string; stack?: string };
    } = {}
  ) => ({
    uuid,
    type: 'http-client',
    content: {
      status: options.status || (data.statusCode >= 400 ? 'failed' : 'completed'),
      duration: options.duration ?? 150,
      metadata: {
        package: options.package || 'axios',
        method: data.method || 'GET',
      },
      data: {
        origin: data.origin,
        pathname: data.pathname || '/',
        method: data.method || 'GET',
        statusCode: data.statusCode,
        statusMessage: data.statusMessage || (data.statusCode === 200 ? 'OK' : 'Error'),
        headers: data.headers || { 'content-type': 'application/json' },
        responseBody: data.responseBody,
        responseBodySize: data.responseBodySize || 0,
      },
      location: { file: 'api.ts', line: '25' },
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
    watcher = new HTTPClientWatcher(redisClient as any, database);
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

    it('should return HTTP client entries', async () => {
      await database.insert([
        createHTTPClientEntry('http-client:1', { origin: 'https://api.example.com', pathname: '/users', method: 'GET', statusCode: 200 }, { duration: 150, request_id: 'req-1' }),
        createHTTPClientEntry('http-client:2', { origin: 'https://api.example.com', pathname: '/data', method: 'POST', statusCode: 201 }, { duration: 200, request_id: 'req-2' }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(2);
    });

    it('should group by origin', async () => {
      await database.insert([
        createHTTPClientEntry('http-client:1', { origin: 'https://api.example.com', pathname: '/users', statusCode: 200 }, { duration: 150 }),
        createHTTPClientEntry('http-client:2', { origin: 'https://api.example.com', pathname: '/users', statusCode: 200 }, { duration: 180 }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(1);
    });

    it('should filter by status code', async () => {
      await database.insert([
        createHTTPClientEntry('http-client:200', { origin: 'https://api.example.com', pathname: '/ok', statusCode: 200 }, { duration: 100 }),
        createHTTPClientEntry('http-client:500', { origin: 'https://api.example.com', pathname: '/error', statusCode: 500 }, { status: 'failed', duration: 50, error: { name: 'Error', message: 'Internal Server Error' } }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h', status: '5xx' });
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
        createHTTPClientEntry('http-client:view-test', { origin: 'https://api.example.com', pathname: '/test', statusCode: 200 }, { duration: 100 }),
      ]);

      const req = createMockRequest({}, { id: 'http-client:view-test' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('http-client');
    });

    it('should include related request', async () => {
      const requestId = 'shared-req';
      await database.insert([
        createHTTPClientEntry('http-client:related', { origin: 'https://api.example.com', pathname: '/external', statusCode: 200 }, { request_id: requestId }),
        {
          uuid: 'request:source',
          type: 'request',
          content: {
            status: 'completed',
            duration: 300,
            metadata: { package: 'express', method: 'get' },
            data: { route: '/api/proxy', statusCode: 200, requestSize: 0, responseSize: 500 },
            location: { file: 'express', line: '0' },
          },
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          request_id: requestId,
          job_id: 'null',
          schedule_id: 'null',
        },
      ]);

      const req = createMockRequest({}, { id: 'http-client:related' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('http-client');
      expect(result.body).toHaveProperty('request');
    });
  });

  describe('insertRedisStream', () => {
    it('should add entry to Redis stream', async () => {
      const entry = {
        status: 'completed' as const,
        duration: 150,
        metadata: { package: 'axios' as const, method: 'GET' },
        data: {
          origin: 'https://api.example.com',
          pathname: '/users',
          method: 'GET',
          statusCode: 200,
          statusMessage: 'OK',
          headers: { 'content-type': 'application/json' },
          responseBodySize: 1024,
        },
        location: { file: 'api.ts', line: '25' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:http');
      expect(streamLen).toBeGreaterThan(0);
    });

    it('should handle different HTTP packages', async () => {
      const packages = ['axios', 'fetch', 'http'] as const;
      
      for (const pkg of packages) {
        const entry = {
          status: 'completed' as const,
          duration: 100,
          metadata: { package: pkg, method: 'GET' },
          data: {
            origin: 'https://api.example.com',
            pathname: '/test',
            method: 'GET',
            statusCode: 200,
          },
          location: { file: 'api.ts', line: '25' },
        };

        await watcher.insertRedisStream(entry as any);
      }

      const streamLen = await redisClient.xLen('observatory:stream:http');
      expect(streamLen).toBe(3);
    });

    it('should handle failed requests with error', async () => {
      const entry = {
        status: 'failed' as const,
        duration: 5000,
        metadata: { package: 'axios' as const, method: 'GET' },
        data: {
          origin: 'https://api.example.com',
          pathname: '/timeout',
          method: 'GET',
          statusCode: 0,
          aborted: true,
        },
        location: { file: 'api.ts', line: '30' },
        error: { name: 'AxiosError', message: 'Request timeout', stack: 'Error...' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:http');
      expect(streamLen).toBeGreaterThan(0);
    });
  });
});
