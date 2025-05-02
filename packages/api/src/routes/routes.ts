import { AppControllerRoute, ControllerHandlerReturnType, Promisify } from "../../types";
import { watchers } from "../../index";

export interface ObservatoryBoardRequest {
  requestData: any;
  query: Record<string, any>;
  params: Record<string, any>;
  body: Record<string, any>;
}

const apiRoutes : AppControllerRoute[] = [
  {
    method: 'get',
    route: '/api/',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.dashboard.getIndex(request)
  },
  {
    method: 'get',
    route: '/api/requests',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.requests.getIndex(request)
  },
  {
    method: 'get',
    route: '/api/requests/:id',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.requests.getView(request)
  },
  {
    method: 'post',
    route: '/api/requests/:id/related',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.requests.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/api/requests/refresh',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.requests.refreshData(request)
  },
  {
    method: 'get',
    route: '/api/queries',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.query.getIndex(request)
  },
  {
    method: 'get',
    route: '/api/queries/:id',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.query.getView(request)
  },
  {
    method: 'post',
    route: '/api/queries/:id/related',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.query.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/api/queries/refresh',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.query.refreshData(request)
  },
  {
    method: 'get',
    route: '/api/notifications',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.notifications.getIndex(request)
  },
  {
    method: 'get',
    route: '/api/notifications/:id',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.notifications.getView(request)
  },
  {
    method: 'post',
    route: '/api/notifications/:id/related',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.notifications.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/api/notifications/refresh',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.notifications.refreshData(request)
  },
  {
    method: 'get',
    route: '/api/mails',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.mailer.getIndex(request)
  },
  {
    method: 'get',
    route: '/api/mails/:id',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.mailer.getView(request)
  },
  {
    method: 'post',
    route: '/api/mails/:id/related',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.mailer.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/api/mails/refresh',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.mailer.refreshData(request)
  },
  {
    method: 'get',
    route: '/api/exceptions',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.errors.getIndex(request)
  },
  {
    method: 'get',
    route: '/api/exceptions/:id',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.errors.getView(request)
  },
  {
    method: 'post',
    route: '/api/exceptions/:id/related',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.errors.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/api/exceptions/refresh',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.errors.refreshData(request)
  },
  {
    method: 'get',
    route: '/api/jobs',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.jobs.getIndex(request)
  },
  {
    method: 'get',
    route: '/api/jobs/:id',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.jobs.getView(request)
  },
  {
    method: 'post',
    route: '/api/jobs/:id/related',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.jobs.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/api/jobs/refresh',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.jobs.refreshData(request)
  },
  {
    method: 'get',
    route: '/api/schedules',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.scheduler.getIndex(request)
  },
  {
    method: 'get',
    route: '/api/schedules/:id',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.scheduler.getView(request)
  },
  {
    method: 'post',
    route: '/api/schedules/:id/related',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.scheduler.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/api/schedules/refresh',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.scheduler.refreshData(request)
  },
  {
    method: 'get',
    route: '/api/https',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.http.getIndex(request)
  },
  {
    method: 'get',
    route: '/api/http/:id',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.http.getView(request)
  },
  {
    method: 'post',
    route: '/api/http/:id/related',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.http.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/api/http/refresh',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.http.refreshData(request)
  },
  {
    method: 'get',
    route: '/api/cache',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.cache.getIndex(request)
  },
  {
    method: 'get',
    route: '/api/cache/:id',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.cache.getView(request)
  },
  {
    method: 'post',
    route: '/api/cache/:id/related',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.cache.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/api/cache/refresh',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.cache.refreshData(request)
  },
  {
    method: 'get',
    route: '/api/logs',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.logging.getIndex(request)
  },
  {
    method: 'get',
    route: '/api/logs/:id',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.logging.getView(request)
  },
  {
    method: 'post',
    route: '/api/logs/:id/related',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.logging.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/api/logs/refresh',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.logging.refreshData(request)
  },
  {
    method: 'get',
    route: '/api/views',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.view.getIndex(request)
  },
  {
    method: 'get',
    route: '/api/views/:id',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.view.getView(request)
  },
  {
    method: 'get', 
    route: '/api/views/refresh',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.view.refreshData(request)
  },
  {
    method: 'post',
    route: '/api/views/:id/related',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.view.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/api/models',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.model.getIndex(request)
  },
  {
    method: 'get',
    route: '/api/models/:id',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.model.getView(request)
  },
  {
    method: 'post',
    route: '/api/models/:id/related',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.model.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/api/models/refresh',
    handler: (request?: ObservatoryBoardRequest) : Promisify<ControllerHandlerReturnType> => watchers.model.refreshData(request)
  }
];

export default apiRoutes;
