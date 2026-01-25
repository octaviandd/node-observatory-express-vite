/**
 * MailWatcher Integration Tests
 * 
 * Entry structure matches postmark-common.ts patcher output:
 * {
 *   status: 'completed' | 'failed',
 *   duration: number,
 *   metadata: { package: 'postmark', command: 'SendMail' | 'SendTemplateEmail' },
 *   data: {
 *     to: string[],
 *     cc: string[],
 *     bcc: string[],
 *     from: string,
 *     subject?: string,
 *     body?: string,
 *     templateId?: string,
 *     messageId?: string
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

describe('MailWatcher Integration', () => {
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
   * Creates a mail entry in the patcher format
   */
  const createMailEntry = (
    uuid: string,
    data: {
      to: string[];
      cc?: string[];
      bcc?: string[];
      from: string;
      subject?: string;
      body?: string;
      templateId?: string;
      messageId?: string;
    },
    options: {
      status?: 'completed' | 'failed';
      duration?: number;
      command?: 'SendMail' | 'SendTemplateEmail';
      request_id?: string;
      job_id?: string;
      schedule_id?: string;
      error?: { name: string; message: string; stack?: string };
    } = {}
  ) => ({
    uuid,
    type: 'mail',
    content: {
      status: options.status || 'completed',
      duration: options.duration ?? 500,
      metadata: { package: 'postmark' as const, command: options.command || 'SendMail' },
      data: {
        to: data.to,
        cc: data.cc || [],
        bcc: data.bcc || [],
        from: data.from,
        subject: data.subject,
        body: data.body,
        templateId: data.templateId,
        messageId: data.messageId,
      },
      location: { file: 'mailer.ts', line: '25' },
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
    watcher = new GenericWatcher(redisClient as any, database, WATCHER_CONFIGS.mail);
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

    it('should return mail entries', async () => {
      await database.insert([
        createMailEntry('mail:1', {
          to: ['user@example.com'],
          from: 'noreply@app.com',
          subject: 'Welcome',
          body: 'Welcome to our app!',
        }, { duration: 500 }),
        createMailEntry('mail:2', {
          to: ['admin@example.com'],
          from: 'noreply@app.com',
          subject: 'Alert',
          body: 'System alert',
        }, { status: 'failed', duration: 100, error: { name: 'MailError', message: 'Invalid recipient' } }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'instance', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(2);
    });

    it('should group by recipient', async () => {
      await database.insert([
        createMailEntry('mail:1', {
          to: ['user@example.com'],
          from: 'noreply@app.com',
          subject: 'Test 1',
        }, { duration: 500 }),
        createMailEntry('mail:2', {
          to: ['user@example.com'],
          from: 'noreply@app.com',
          subject: 'Test 2',
        }, { duration: 450 }),
      ]);

      const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(1);
    });

    it('should filter by status', async () => {
      await database.insert([
        createMailEntry('mail:completed', {
          to: ['user@example.com'],
          from: 'noreply@app.com',
          subject: 'OK',
        }, { status: 'completed', duration: 500 }),
        createMailEntry('mail:failed', {
          to: ['invalid@example.com'],
          from: 'noreply@app.com',
          subject: 'Error',
        }, { status: 'failed', duration: 100, error: { name: 'Error', message: 'Failed' } }),
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
        createMailEntry('mail:view-test', {
          to: ['user@example.com'],
          from: 'noreply@app.com',
          subject: 'Test',
          body: 'Test body',
        }, { duration: 500 }),
      ]);

      const req = createMockRequest({}, { id: 'mail:view-test' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('mail');
    });

    it('should handle template emails', async () => {
      await database.insert([
        createMailEntry('mail:template', {
          to: ['user@example.com'],
          from: 'noreply@app.com',
          templateId: 'welcome-template',
        }, { command: 'SendTemplateEmail', duration: 600 }),
      ]);

      const req = createMockRequest({}, { id: 'mail:template' });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty('mail');
    });
  });

  describe('insertRedisStream', () => {
    it('should add entry to Redis stream', async () => {
      const entry = {
        status: 'completed' as const,
        duration: 500,
        metadata: { package: 'postmark' as const, command: 'SendMail' as const },
        data: {
          to: ['user@example.com'],
          cc: [],
          bcc: [],
          from: 'noreply@app.com',
          subject: 'Test',
          body: 'Test body',
        },
        location: { file: 'mailer.ts', line: '25' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:mail');
      expect(streamLen).toBeGreaterThan(0);
    });

    it('should handle template emails in stream', async () => {
      const entry = {
        status: 'completed' as const,
        duration: 600,
        metadata: { package: 'postmark' as const, command: 'SendTemplateEmail' as const },
        data: {
          to: ['user@example.com'],
          cc: [],
          bcc: [],
          from: 'noreply@app.com',
          templateId: 'welcome-template',
        },
        location: { file: 'mailer.ts', line: '30' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:mail');
      expect(streamLen).toBeGreaterThan(0);
    });

    it('should handle failed emails with error', async () => {
      const entry = {
        status: 'failed' as const,
        duration: 100,
        metadata: { package: 'postmark' as const, command: 'SendMail' as const },
        data: {
          to: ['invalid@'],
          cc: [],
          bcc: [],
          from: 'noreply@app.com',
          subject: 'Test',
        },
        location: { file: 'mailer.ts', line: '25' },
        error: { name: 'MailError', message: 'Invalid email address', stack: 'Error...' },
      };

      await watcher.insertRedisStream(entry as any);

      const streamLen = await redisClient.xLen('observatory:stream:mail');
      expect(streamLen).toBeGreaterThan(0);
    });
  });
});
