import { watchers } from "../index.js";

const apiRoutes : AppControllerRoute[] = [
  {
    method: 'get',
    route: '/api/',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.dashboard.index(request)
  },
  {
    method: 'get',
    route: '/api/requests',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.requests.index(request)
  },
  {
    method: 'get',
    route: '/api/requests/:id',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.requests.view(request)
  },
  // {
  //   method: 'post',
  //   route: '/api/requests/:id/related',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.requests.metadata(request)
  // },
  // {
  //   method: 'get',
  //   route: '/api/requests/refresh',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.requests.refreshData(request)
  // },
  {
    method: 'get',
    route: '/api/queries',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.query.index(request)
  },
  {
    method: 'get',
    route: '/api/queries/:id',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.query.view(request)
  },
  // {
  //   method: 'post',
  //   route: '/api/queries/:id/related',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.query.metadata(request)
  // },
  // {
  //   method: 'get',
  //   route: '/api/queries/refresh',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.query.refreshData(request)
  // },
  {
    method: 'get',
    route: '/api/notifications',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.notifications.index(request)
  },
  {
    method: 'get',
    route: '/api/notifications/:id',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.notifications.view(request)
  },
  // {
  //   method: 'post',
  //   route: '/api/notifications/:id/related',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.notifications.metadata(request)
  // },
  // {
  //   method: 'get',
  //   route: '/api/notifications/refresh',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.notifications.refreshData(request)
  // },
  {
    method: 'get',
    route: '/api/mails',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.mailer.index(request)
  },
  {
    method: 'get',
    route: '/api/mails/:id',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.mailer.view(request)
  },
  // {
  //   method: 'post',
  //   route: '/api/mails/:id/related',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.mailer.metadata(request)
  // },
  // {
  //   method: 'get',
  //   route: '/api/mails/refresh',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.mailer.refreshData(request)
  // },
  {
    method: 'get',
    route: '/api/exceptions',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.errors.index(request)
  },
  {
    method: 'get',
    route: '/api/exceptions/:id',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.errors.view(request)
  },
  // {
  //   method: 'post',
  //   route: '/api/exceptions/:id/related',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.errors.metadata(request)
  // },
  // {
  //   method: 'get',
  //   route: '/api/exceptions/refresh',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.errors.refreshData(request)
  // },
  {
    method: 'get',
    route: '/api/jobs',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.jobs.index(request)
  },
  {
    method: 'get',
    route: '/api/jobs/:id',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.jobs.view(request)
  },
  // {
  //   method: 'post',
  //   route: '/api/jobs/:id/related',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.jobs.metadata(request)
  // },
  // {
  //   method: 'get',
  //   route: '/api/jobs/refresh',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.jobs.refreshData(request)
  // },
  {
    method: 'get',
    route: '/api/schedules',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.scheduler.index(request)
  },
  {
    method: 'get',
    route: '/api/schedules/:id',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.scheduler.view(request)
  },
  // {
  //   method: 'post',
  //   route: '/api/schedules/:id/related',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.scheduler.metadata(request)
  // },
  // {
  //   method: 'get',
  //   route: '/api/schedules/refresh',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.scheduler.refreshData(request)
  // },
  {
    method: 'get',
    route: '/api/https',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.http.index(request)
  },
  {
    method: 'get',
    route: '/api/http/:id',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.http.view(request)
  },
  // {
  //   method: 'post',
  //   route: '/api/http/:id/related',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.http.metadata(request)
  // },
  // {
  //   method: 'get',
  //   route: '/api/http/refresh',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.http.refreshData(request)
  // },
  {
    method: 'get',
    route: '/api/cache',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.cache.index(request)
  },
  {
    method: 'get',
    route: '/api/cache/:id',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.cache.view(request)
  },
  // {
  //   method: 'post',
  //   route: '/api/cache/:id/related',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.cache.metadata(request)
  // },
  // {
  //   method: 'get',
  //   route: '/api/cache/refresh',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.cache.refreshData(request)
  // },
  {
    method: 'get',
    route: '/api/logs',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.logging.index(request)
  },
  {
    method: 'get',
    route: '/api/logs/:id',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.logging.view(request)
  },
  // {
  //   method: 'post',
  //   route: '/api/logs/:id/related',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.logging.metadata(request)
  // },
  // {
  //   method: 'get',
  //   route: '/api/logs/refresh',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.logging.refreshData(request)
  // },
  {
    method: 'get',
    route: '/api/views',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.view.index(request)
  },
  {
    method: 'get',
    route: '/api/views/:id',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.view.view(request)
  },
  // {
  //   method: 'get', 
  //   route: '/api/views/refresh',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.view.refreshData(request)
  // },
  // {
  //   method: 'post',
  //   route: '/api/views/:id/related',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.view.metadata(request)
  // },
  {
    method: 'get',
    route: '/api/models',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.model.index(request)
  },
  {
    method: 'get',
    route: '/api/models/:id',
    handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.model.view(request)
  },
  // {
  //   method: 'post',
  //   route: '/api/models/:id/related',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.model.metadata(request)
  // },
  // {
  //   method: 'get',
  //   route: '/api/models/refresh',
  //   handler: (request: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.model.refreshData(request)
  // }
];

export default apiRoutes;
