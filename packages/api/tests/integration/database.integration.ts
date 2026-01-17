// /**
//  * Database Integration Tests
//  * 
//  * These tests verify the Database class methods work correctly with a real MySQL connection.
//  * They test actual SQL execution against the test Docker container.
//  * 
//  * Entry structure matches patcher output format:
//  * {
//  *   status: 'completed' | 'failed',
//  *   duration: number,
//  *   metadata: { package: string, method?: string },
//  *   data: { ... },
//  *   location?: { file: string, line: string },
//  *   error?: { name: string, message: string, stack?: string }
//  * }
//  */

// import Database from '../../src/core/database-sql';
// import { getMySQLConnection, resetDatabase } from './test-utils';
// import type { Connection } from 'mysql2/promise';

// describe('Database Integration Tests', () => {
//   let database: Database;
//   let connection: Connection;

//   /**
//    * Creates a request entry in the patcher format
//    */
//   const createRequestEntry = (
//     uuid: string,
//     data: {
//       route: string;
//       statusCode?: number;
//     },
//     options: {
//       duration?: number;
//       method?: string;
//       request_id?: string;
//       created_at?: string;
//     } = {}
//   ): RedisEntry => ({
//     uuid,
//     type: 'request',
//     content: {
//       status: (data.statusCode ?? 200) >= 400 ? 'failed' : 'completed',
//       duration: options.duration ?? 100,
//       metadata: { package: 'express', method: options.method || 'get' },
//       data: {
//         route: data.route,
//         statusCode: data.statusCode ?? 200,
//         requestSize: 0,
//         responseSize: 100,
//       },
//       location: { file: 'express', line: '0' },
//     },
//     created_at: options.created_at || new Date().toISOString().replace('T', ' ').substring(0, 19),
//     request_id: options.request_id || 'null',
//     job_id: 'null',
//     schedule_id: 'null',
//   });

//   /**
//    * Creates a cache entry in the patcher format
//    */
//   const createCacheEntry = (
//     uuid: string,
//     data: { key: string; hits?: number; misses?: number; writes?: number },
//     options: { duration?: number; request_id?: string; created_at?: string } = {}
//   ): RedisEntry => ({
//     uuid,
//     type: 'cache',
//     content: {
//       status: 'completed',
//       duration: options.duration ?? 50,
//       metadata: { package: 'redis', command: 'get' },
//       data: {
//         key: data.key,
//         hits: data.hits ?? 0,
//         misses: data.misses ?? 0,
//         writes: data.writes ?? 0,
//       },
//       location: { file: 'cache.ts', line: '10' },
//     },
//     created_at: options.created_at || new Date().toISOString().replace('T', ' ').substring(0, 19),
//     request_id: options.request_id || 'null',
//     job_id: 'null',
//     schedule_id: 'null',
//   });

//   beforeAll(async () => {
//     connection = await getMySQLConnection();
//     database = new Database(connection);
//   });

//   beforeEach(async () => {
//     await resetDatabase();
//   });

//   describe('insert', () => {
//     it('should insert multiple entries in a single transaction', async () => {
//       const entries: RedisEntry[] = [
//         createRequestEntry('test:1234', { route: '/api/test', statusCode: 200 }, { request_id: 'req-123', created_at: '2025-01-01 00:00:00' }),
//         createRequestEntry('test:5678', { route: '/api/users', statusCode: 201 }, { method: 'post', request_id: 'req-456', created_at: '2025-01-01 00:00:01' }),
//       ];

//       await database.insert(entries);

//       // Verify entries were inserted
//       const [rows]: any = await connection.query(
//         'SELECT * FROM observatory_entries ORDER BY uuid'
//       );
//       expect(rows).toHaveLength(2);
//       expect(rows[0].uuid).toBe('test:1234');
//       expect(rows[1].uuid).toBe('test:5678');
//     });

//     it('should rollback on insert failure (duplicate uuid)', async () => {
//       const entries: RedisEntry[] = [
//         createRequestEntry('duplicate:123', { route: '/api/test' }, { created_at: '2025-01-01 00:00:00', request_id: 'req-123' }),
//       ];

//       // Insert first entry
//       await database.insert(entries);

//       // Try to insert duplicate
//       await expect(database.insert(entries)).rejects.toThrow();

//       // Verify only one entry exists
//       const [rows]: any = await connection.query(
//         'SELECT COUNT(*) as count FROM observatory_entries WHERE uuid = ?',
//         ['duplicate:123']
//       );
//       expect(rows[0].count).toBe(1);
//     });

//     it('should skip insert when entries array is empty', async () => {
//       await database.insert([]);

//       const [rows]: any = await connection.query(
//         'SELECT COUNT(*) as count FROM observatory_entries'
//       );
//       expect(rows[0].count).toBe(0);
//     });
//   });

//   describe('getEntry', () => {
//     it('should retrieve a single entry by uuid', async () => {
//       // Insert test data
//       await database.insert([
//         createRequestEntry('request:123', { route: '/api/test', statusCode: 200 }, { request_id: 'req-123', created_at: '2025-01-01 00:00:00' }),
//       ]);

//       const result = await database.getEntry('request:123');

//       expect(result).toBeDefined();
//       expect(result.uuid).toBe('request:123');
//       expect(result.type).toBe('request');
//     });
//   });

//   describe('getAllEntriesByType', () => {
//     it('should retrieve all entries of a specific type', async () => {
//       // Insert mixed types
//       await database.insert([
//         createRequestEntry('request:1', { route: '/api/1' }, { request_id: 'req-1', created_at: '2025-01-01 00:00:00' }),
//         createRequestEntry('request:2', { route: '/api/2' }, { request_id: 'req-2', created_at: '2025-01-01 00:00:01' }),
//         createCacheEntry('cache:1', { key: 'user:1' }, { created_at: '2025-01-01 00:00:02' }),
//       ]);

//       const result = await database.getAllEntriesByType('request');

//       expect(result).toHaveLength(2);
//       expect(result.every((r: any) => r.type === 'request')).toBe(true);
//     });
//   });

//   describe('getByInstance', () => {
//     it('should retrieve entries with filters applied', async () => {
//       // Insert test data
//       await database.insert([
//         createRequestEntry('request:1', { route: '/api/users', statusCode: 200 }, { request_id: 'req-1' }),
//         createRequestEntry('request:2', { route: '/api/posts', statusCode: 404 }, { request_id: 'req-2' }),
//       ]);

//       const filters = {
//         period: '24h' as const,
//         limit: 20,
//         offset: 0,
//         query: '',
//         status: 'all' as const,
//         index: 'instance' as const,
//         isTable: true,
//       };

//       const result = await database.getByInstance(filters, 'request');

//       expect(result).toHaveLength(2);
//     });

//     it('should apply pagination correctly', async () => {
//       // Insert 5 entries
//       const entries = Array.from({ length: 5 }, (_, i) =>
//         createRequestEntry(`request:${i}`, { route: `/api/${i}`, statusCode: 200 }, { request_id: `req-${i}` })
//       );
//       await database.insert(entries);

//       const filters = {
//         period: '24h' as const,
//         limit: 2,
//         offset: 2,
//         query: '',
//         status: 'all' as const,
//         index: 'instance' as const,
//         isTable: true,
//       };

//       const result = await database.getByInstance(filters, 'request');

//       expect(result).toHaveLength(2);
//     });
//   });

//   describe('getByInstanceCount', () => {
//     it('should return correct count with filters applied', async () => {
//       // Insert test data
//       await database.insert([
//         createRequestEntry('request:1', { route: '/api/users', statusCode: 200 }, { request_id: 'req-1' }),
//         createRequestEntry('request:2', { route: '/api/posts', statusCode: 200 }, { request_id: 'req-2' }),
//         createCacheEntry('cache:1', { key: 'test' }),
//       ]);

//       const filters = {
//         period: '24h' as const,
//         query: '',
//         status: 'all' as const,
//         index: 'instance' as const,
//         isTable: true,
//         limit: 20,
//         offset: 0,
//       };

//       const result = await database.getByInstanceCount(filters, 'request');

//       expect(result).toBe(2);
//     });
//   });

//   describe('findExistingUuids', () => {
//     it('should return matching uuids from database', async () => {
//       // Insert some entries
//       await database.insert([
//         createRequestEntry('request:1', { route: '/api/1' }, { created_at: '2025-01-01 00:00:00' }),
//         createRequestEntry('request:3', { route: '/api/3' }, { created_at: '2025-01-01 00:00:01' }),
//       ]);

//       const uuids = ['request:1', 'request:2', 'request:3'];
//       const result = await database.findExistingUuids(uuids);

//       expect(result).toHaveLength(2);
//       expect(result).toContain('request:1');
//       expect(result).toContain('request:3');
//       expect(result).not.toContain('request:2');
//     });

//     it('should return empty array when no uuids provided', async () => {
//       const result = await database.findExistingUuids([]);
//       expect(result).toEqual([]);
//     });
//   });

//   describe('delete', () => {
//     it('should delete entry by uuid', async () => {
//       // Insert entry
//       await database.insert([
//         createRequestEntry('request:to-delete', { route: '/api/test' }, { created_at: '2025-01-01 00:00:00' }),
//       ]);

//       const result = await database.delete('request:to-delete');

//       expect(result).toBe(true);

//       // Verify entry was deleted
//       const [rows]: any = await connection.query(
//         'SELECT COUNT(*) as count FROM observatory_entries WHERE uuid = ?',
//         ['request:to-delete']
//       );
//       expect(rows[0].count).toBe(0);
//     });
//   });

//   describe('migrations', () => {
//     describe('up', () => {
//       it('should not fail when table already exists', async () => {
//         // Table should already exist from test setup
//         await expect(database.up(connection)).resolves.not.toThrow();
//       });
//     });
//   });
// });
