// /**
//  * API Routes Integration Tests
//  * 
//  * These tests verify the API route handlers work correctly,
//  * testing the full request/response cycle for each endpoint.
//  */

// import type { RedisClientType } from 'redis';
// import Database from '../../src/core/database-sql';

// // Mock the watchers module
// jest.mock('../../src/core/index', () => ({
//   watchers: {},
//   patchedGlobal: global,
// }));

// describe('API Routes Integration Tests', () => {
//   let mockRedis: jest.Mocked<RedisClientType>;
//   let mockDB: jest.Mocked<Database>;
//   let apiRoutes: AppControllerRoute[];

//   const createMockRequest = (
//     query: Record<string, string> = {},
//     params: Record<string, string> = {},
//     body: Record<string, any> = {}
//   ): ObservatoryBoardRequest => ({
//     query,
//     params,
//     body,
//     requestData: {},
//   } as unknown as ObservatoryBoardRequest);

//   beforeAll(async () => {
//     // Initialize mock watchers
//     mockRedis = {
//       xGroupCreate: jest.fn().mockResolvedValue(undefined),
//       xReadGroup: jest.fn().mockResolvedValue([]),
//       xAdd: jest.fn().mockResolvedValue('test-id'),
//       xAck: jest.fn().mockResolvedValue(1),
//       xPendingRange: jest.fn().mockResolvedValue([]),
//       xTrim: jest.fn().mockResolvedValue(0),
//       xClaim: jest.fn().mockResolvedValue([]),
//     } as unknown as jest.Mocked<RedisClientType>;

//     mockDB = {
//       getByInstance: jest.fn().mockResolvedValue([]),
//       getByInstanceCount: jest.fn().mockResolvedValue(0),
//       getByGroup: jest.fn().mockResolvedValue([]),
//       getByGroupCount: jest.fn().mockResolvedValue(0),
//       getGraphData: jest.fn().mockResolvedValue({
//         countFormattedData: [],
//         durationFormattedData: [],
//         count: '0',
//       }),
//       getEntry: jest.fn().mockResolvedValue({
//         uuid: 'test:123',
//         type: 'test',
//         content: {},
//         created_at: '2025-01-01 00:00:00',
//       }),
//       getRelatedViewdata: jest.fn().mockResolvedValue([]),
//       findExistingUuids: jest.fn().mockResolvedValue([]),
//     } as unknown as jest.Mocked<Database>;

//     // Initialize watchers in the module
//     const { watchers } = await import('../../src/core/index');
//     const CacheWatcher = (await import('../../src/core/watchers/CacheWatcher')).default;
//     const RequestWatcher = (await import('../../src/core/watchers/RequestWatcher')).default;
//     const LogWatcher = (await import('../../src/core/watchers/LogWatcher')).default;
//     const JobWatcher = (await import('../../src/core/watchers/JobWatcher')).default;
//     const ExceptionWatcher = (await import('../../src/core/watchers/ExceptionWatcher')).default;
//     const HTTPClientWatcher = (await import('../../src/core/watchers/HTTPClientWatcher')).default;
//     const MailWatcher = (await import('../../src/core/watchers/MailWatcher')).default;
//     const NotificationWatcher = (await import('../../src/core/watchers/NotificationWatcher')).default;
//     const QueryWatcher = (await import('../../src/core/watchers/QueryWatcher')).default;
//     const ScheduleWatcher = (await import('../../src/core/watchers/ScheduleWatcher')).default;
//     const ViewsWatcher = (await import('../../src/core/watchers/ViewsWatcher')).default;
//     const ModelWatcher = (await import('../../src/core/watchers/ModelWatcher')).default;

//     watchers.cache = new CacheWatcher(mockRedis, mockDB);
//     watchers.requests = new RequestWatcher(mockRedis, mockDB);
//     watchers.logging = new LogWatcher(mockRedis, mockDB);
//     watchers.jobs = new JobWatcher(mockRedis, mockDB);
//     watchers.errors = new ExceptionWatcher(mockRedis, mockDB);
//     watchers.http = new HTTPClientWatcher(mockRedis, mockDB);
//     watchers.mailer = new MailWatcher(mockRedis, mockDB);
//     watchers.notifications = new NotificationWatcher(mockRedis, mockDB);
//     watchers.query = new QueryWatcher(mockRedis, mockDB);
//     watchers.scheduler = new ScheduleWatcher(mockRedis, mockDB);
//     watchers.view = new ViewsWatcher(mockRedis, mockDB);
//     watchers.model = new ModelWatcher(mockRedis, mockDB);

//     // Import routes after watchers are initialized
//     apiRoutes = (await import('../../src/core/routes/routes')).default;
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   describe('Request Routes', () => {
//     describe('GET /api/requests', () => {
//       it('should return request index data', async () => {
//         const route = apiRoutes.find(r => r.route === '/api/requests' && r.method === 'get');
//         expect(route).toBeDefined();

//         const mockResults = [
//           { route: '/api/users', total: 100, count_200: 95, count_400: 3, count_500: 2 },
//         ];
//         mockDB.getByGroup.mockResolvedValue(mockResults as any);
//         mockDB.getByGroupCount.mockResolvedValue(1);

//         const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
//         const response = await route!.handler(req);

//         expect(response.statusCode).toBe(200);
//         expect(response.body).toHaveProperty('results');
//         expect(response.body).toHaveProperty('count');
//       });
//     });

//     describe('GET /api/requests/:id', () => {
//       it('should return single request view data', async () => {
//         const route = apiRoutes.find(r => r.route === '/api/requests/:id' && r.method === 'get');
//         expect(route).toBeDefined();

//         const mockEntry = {
//           uuid: 'request:123',
//           type: 'request',
//           content: { route: '/api/users', statusCode: 200 },
//           requestId: 'req-123',
//         };
//         mockDB.getEntry.mockResolvedValue(mockEntry as any);

//         const req = createMockRequest({}, { id: 'request:123' });
//         const response = await route!.handler(req);

//         expect(response.statusCode).toBe(200);
//         expect(response.body).toBeDefined();
//       });
//     });
//   });

//   describe('Query Routes', () => {
//     describe('GET /api/queries', () => {
//       it('should return query index data', async () => {
//         const route = apiRoutes.find(r => r.route === '/api/queries' && r.method === 'get');
//         expect(route).toBeDefined();

//         const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
//         const response = await route!.handler(req);

//         expect(response.statusCode).toBe(200);
//       });
//     });

//     describe('GET /api/queries/:id', () => {
//       it('should return single query view data', async () => {
//         const route = apiRoutes.find(r => r.route === '/api/queries/:id' && r.method === 'get');
//         expect(route).toBeDefined();

//         const req = createMockRequest({}, { id: 'query:123' });
//         const response = await route!.handler(req);

//         expect(response.statusCode).toBe(200);
//       });
//     });
//   });

//   describe('Notification Routes', () => {
//     describe('GET /api/notifications', () => {
//       it('should return notification index data', async () => {
//         const route = apiRoutes.find(r => r.route === '/api/notifications' && r.method === 'get');
//         expect(route).toBeDefined();

//         const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
//         const response = await route!.handler(req);

//         expect(response.statusCode).toBe(200);
//       });
//     });
//   });

//   describe('Mail Routes', () => {
//     describe('GET /api/mails', () => {
//       it('should return mail index data', async () => {
//         const route = apiRoutes.find(r => r.route === '/api/mails' && r.method === 'get');
//         expect(route).toBeDefined();

//         const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
//         const response = await route!.handler(req);

//         expect(response.statusCode).toBe(200);
//       });
//     });
//   });

//   describe('Exception Routes', () => {
//     describe('GET /api/exceptions', () => {
//       it('should return exception index data', async () => {
//         const route = apiRoutes.find(r => r.route === '/api/exceptions' && r.method === 'get');
//         expect(route).toBeDefined();

//         const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
//         const response = await route!.handler(req);

//         expect(response.statusCode).toBe(200);
//       });
//     });
//   });

//   describe('Job Routes', () => {
//     describe('GET /api/jobs', () => {
//       it('should return job index data', async () => {
//         const route = apiRoutes.find(r => r.route === '/api/jobs' && r.method === 'get');
//         expect(route).toBeDefined();

//         const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
//         const response = await route!.handler(req);

//         expect(response.statusCode).toBe(200);
//       });
//     });
//   });

//   describe('Schedule Routes', () => {
//     describe('GET /api/schedules', () => {
//       it('should return schedule index data', async () => {
//         const route = apiRoutes.find(r => r.route === '/api/schedules' && r.method === 'get');
//         expect(route).toBeDefined();

//         const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
//         const response = await route!.handler(req);

//         expect(response.statusCode).toBe(200);
//       });
//     });
//   });

//   describe('HTTP Client Routes', () => {
//     describe('GET /api/https', () => {
//       it('should return HTTP client index data', async () => {
//         const route = apiRoutes.find(r => r.route === '/api/https' && r.method === 'get');
//         expect(route).toBeDefined();

//         const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
//         const response = await route!.handler(req);

//         expect(response.statusCode).toBe(200);
//       });
//     });

//     describe('GET /api/http/:id', () => {
//       it('should return single HTTP client view data', async () => {
//         const route = apiRoutes.find(r => r.route === '/api/http/:id' && r.method === 'get');
//         expect(route).toBeDefined();

//         const req = createMockRequest({}, { id: 'http:123' });
//         const response = await route!.handler(req);

//         expect(response.statusCode).toBe(200);
//       });
//     });
//   });

//   describe('Cache Routes', () => {
//     describe('GET /api/cache', () => {
//       it('should return cache index data', async () => {
//         const route = apiRoutes.find(r => r.route === '/api/cache' && r.method === 'get');
//         expect(route).toBeDefined();

//         const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
//         const response = await route!.handler(req);

//         expect(response.statusCode).toBe(200);
//       });
//     });
//   });

//   describe('Log Routes', () => {
//     describe('GET /api/logs', () => {
//       it('should return log index data', async () => {
//         const route = apiRoutes.find(r => r.route === '/api/logs' && r.method === 'get');
//         expect(route).toBeDefined();

//         const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
//         const response = await route!.handler(req);

//         expect(response.statusCode).toBe(200);
//       });
//     });
//   });

//   describe('View Routes', () => {
//     describe('GET /api/views', () => {
//       it('should return view index data', async () => {
//         const route = apiRoutes.find(r => r.route === '/api/views' && r.method === 'get');
//         expect(route).toBeDefined();

//         const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
//         const response = await route!.handler(req);

//         expect(response.statusCode).toBe(200);
//       });
//     });
//   });

//   describe('Model Routes', () => {
//     describe('GET /api/models', () => {
//       it('should return model index data', async () => {
//         const route = apiRoutes.find(r => r.route === '/api/models' && r.method === 'get');
//         expect(route).toBeDefined();

//         const req = createMockRequest({ table: 'true', index: 'group', period: '24h' });
//         const response = await route!.handler(req);

//         expect(response.statusCode).toBe(200);
//       });
//     });
//   });

//   describe('Route Structure', () => {
//     it('should have all expected routes defined', () => {
//       const expectedRoutes = [
//         '/api/requests',
//         '/api/requests/:id',
//         '/api/queries',
//         '/api/queries/:id',
//         '/api/notifications',
//         '/api/notifications/:id',
//         '/api/mails',
//         '/api/mails/:id',
//         '/api/exceptions',
//         '/api/exceptions/:id',
//         '/api/jobs',
//         '/api/jobs/:id',
//         '/api/schedules',
//         '/api/schedules/:id',
//         '/api/https',
//         '/api/http/:id',
//         '/api/cache',
//         '/api/cache/:id',
//         '/api/logs',
//         '/api/logs/:id',
//         '/api/views',
//         '/api/views/:id',
//         '/api/models',
//         '/api/models/:id',
//       ];

//       const definedRoutes = apiRoutes.map(r => r.route);

//       expectedRoutes.forEach(expected => {
//         expect(definedRoutes).toContain(expected);
//       });
//     });

//     it('should use GET method for all list routes', () => {
//       const listRoutes = apiRoutes.filter(r => 
//         typeof r.route === 'string' && 
//         !r.route.includes(':id') && 
//         r.route.startsWith('/api/')
//       );

//       listRoutes.forEach(route => {
//         expect(route.method).toBe('get');
//       });
//     });

//     it('should use GET method for all view routes', () => {
//       const viewRoutes = apiRoutes.filter(r => 
//         typeof r.route === 'string' && 
//         r.route.includes(':id')
//       );

//       viewRoutes.forEach(route => {
//         expect(route.method).toBe('get');
//       });
//     });
//   });

//   describe('Error Handling', () => {
//     it('should handle database errors gracefully', async () => {
//       const route = apiRoutes.find(r => r.route === '/api/requests' && r.method === 'get');
//       mockDB.getByGroup.mockRejectedValueOnce(new Error('Database connection failed'));

//       const req = createMockRequest({ table: 'true', index: 'group' });

//       await expect(route!.handler(req)).rejects.toThrow('Database connection failed');
//     });

//     it('should handle invalid entry id', async () => {
//       const route = apiRoutes.find(r => r.route === '/api/requests/:id' && r.method === 'get');
//       mockDB.getEntry.mockResolvedValueOnce(null as any);

//       const req = createMockRequest({}, { id: 'nonexistent:123' });
//       const response = await route!.handler(req);

//       expect(response.statusCode).toBe(200);
//     });
//   });

//   describe('Query Parameters', () => {
//     it('should pass all query parameters to watcher', async () => {
//       const route = apiRoutes.find(r => r.route === '/api/requests' && r.method === 'get');

//       const req = createMockRequest({
//         table: 'true',
//         index: 'group',
//         period: '7d',
//         status: '2xx',
//         offset: '20',
//         limit: '50',
//         q: 'searchterm',
//         key: '/api/users',
//       });

//       await route!.handler(req);

//       expect(mockDB.getByGroup).toHaveBeenCalledWith(
//         expect.objectContaining({
//           period: '7d',
//           index: 'group',
//           status: '2xx',
//           offset: 20,
//           limit: 50,
//           query: 'searchterm',
//           key: '/api/users',
//         }),
//         'request'
//       );
//     });
//   });
// });

