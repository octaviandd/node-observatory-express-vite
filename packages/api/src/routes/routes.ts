import { watchers } from "../../index";

export interface ObservatoryBoardRequest {
  requestData: any;
  query: Record<string, any>;
  params: Record<string, any>;
  body: Record<string, any>;
}

const apiRoutes = [
  {
    method: 'get',
    route: '/dashboard',
    handler: (request?: ObservatoryBoardRequest) => watchers.dashboard.getIndex(request)
  },
  {
    method: 'get',
    route: '/requests',
    handler: (request?: ObservatoryBoardRequest) => watchers.requests.getIndex(request)
  },
  {
    method: 'get',
    route: '/requests/:id',
    handler: (request?: ObservatoryBoardRequest) => watchers.requests.getView(request)
  },
  {
    method: 'post',
    route: '/requests/:id/related',
    handler: (request?: ObservatoryBoardRequest) => watchers.requests.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/requests/refresh',
    handler: (request?: ObservatoryBoardRequest) => watchers.requests.refreshData(request)
  },
  {
    method: 'get',
    route: '/queries',
    handler: (request?: ObservatoryBoardRequest) => watchers.query.getIndex(request)
  },
  {
    method: 'get',
    route: '/queries/:id',
    handler: (request?: ObservatoryBoardRequest) => watchers.query.getView(request)
  },
  {
    method: 'post',
    route: '/queries/:id/related',
    handler: (request?: ObservatoryBoardRequest) => watchers.query.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/queries/refresh',
    handler: (request?: ObservatoryBoardRequest) => watchers.query.refreshData(request)
  },
  {
    method: 'get',
    route: '/notifications',
    handler: (request?: ObservatoryBoardRequest) => watchers.notifications.getIndex(request)
  },
  {
    method: 'get',
    route: '/notifications/:id',
    handler: (request?: ObservatoryBoardRequest) => watchers.notifications.getView(request)
  },
  {
    method: 'post',
    route: '/notifications/:id/related',
    handler: (request?: ObservatoryBoardRequest) => watchers.notifications.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/notifications/refresh',
    handler: (request?: ObservatoryBoardRequest) => watchers.notifications.refreshData(request)
  },
  {
    method: 'get',
    route: '/mails',
    handler: (request?: ObservatoryBoardRequest) => watchers.mailer.getIndex(request)
  },
  {
    method: 'get',
    route: '/mails/:id',
    handler: (request?: ObservatoryBoardRequest) => watchers.mailer.getView(request)
  },
  {
    method: 'post',
    route: '/mails/:id/related',
    handler: (request?: ObservatoryBoardRequest) => watchers.mailer.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/mails/refresh',
    handler: (request?: ObservatoryBoardRequest) => watchers.mailer.refreshData(request)
  },
  {
    method: 'get',
    route: '/exceptions',
    handler: (request?: ObservatoryBoardRequest) => watchers.errors.getIndex(request)
  },
  {
    method: 'get',
    route: '/exceptions/:id',
    handler: (request?: ObservatoryBoardRequest) => watchers.errors.getView(request)
  },
  {
    method: 'post',
    route: '/exceptions/:id/related',
    handler: (request?: ObservatoryBoardRequest) => watchers.errors.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/exceptions/refresh',
    handler: (request?: ObservatoryBoardRequest) => watchers.errors.refreshData(request)
  },
  {
    method: 'get',
    route: '/jobs',
    handler: (request?: ObservatoryBoardRequest) => watchers.jobs.getIndex(request)
  },
  {
    method: 'get',
    route: '/jobs/:id',
    handler: (request?: ObservatoryBoardRequest) => watchers.jobs.getView(request)
  },
  {
    method: 'post',
    route: '/jobs/:id/related',
    handler: (request?: ObservatoryBoardRequest) => watchers.jobs.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/jobs/refresh',
    handler: (request?: ObservatoryBoardRequest) => watchers.jobs.refreshData(request)
  },
  {
    method: 'get',
    route: '/schedules',
    handler: (request?: ObservatoryBoardRequest) => watchers.scheduler.getIndex(request)
  },
  {
    method: 'get',
    route: '/schedules/:id',
    handler: (request?: ObservatoryBoardRequest) => watchers.scheduler.getView(request)
  },
  {
    method: 'post',
    route: '/schedules/:id/related',
    handler: (request?: ObservatoryBoardRequest) => watchers.scheduler.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/schedules/refresh',
    handler: (request?: ObservatoryBoardRequest) => watchers.scheduler.refreshData(request)
  },
  {
    method: 'get',
    route: '/https',
    handler: (request?: ObservatoryBoardRequest) => watchers.http.getIndex(request)
  },
  {
    method: 'get',
    route: '/http/:id',
    handler: (request?: ObservatoryBoardRequest) => watchers.http.getView(request)
  },
  {
    method: 'post',
    route: '/http/:id/related',
    handler: (request?: ObservatoryBoardRequest) => watchers.http.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/http/refresh',
    handler: (request?: ObservatoryBoardRequest) => watchers.http.refreshData(request)
  },
  {
    method: 'get',
    route: '/cache',
    handler: (request?: ObservatoryBoardRequest) => watchers.cache.getIndex(request)
  },
  {
    method: 'get',
    route: '/cache/:id',
    handler: (request?: ObservatoryBoardRequest) => watchers.cache.getView(request)
  },
  {
    method: 'post',
    route: '/cache/:id/related',
    handler: (request?: ObservatoryBoardRequest) => watchers.cache.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/cache/refresh',
    handler: (request?: ObservatoryBoardRequest) => watchers.cache.refreshData(request)
  },
  {
    method: 'get',
    route: '/logs',
    handler: (request?: ObservatoryBoardRequest) => watchers.logging.getIndex(request)
  },
  {
    method: 'get',
    route: '/logs/:id',
    handler: (request?: ObservatoryBoardRequest) => watchers.logging.getView(request)
  },
  {
    method: 'post',
    route: '/logs/:id/related',
    handler: (request?: ObservatoryBoardRequest) => watchers.logging.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/logs/refresh',
    handler: (request?: ObservatoryBoardRequest) => watchers.logging.refreshData(request)
  },
  {
    method: 'get',
    route: '/views',
    handler: (request?: ObservatoryBoardRequest) => watchers.view.getIndex(request)
  },
  {
    method: 'get',
    route: '/views/:id',
    handler: (request?: ObservatoryBoardRequest) => watchers.view.getView(request)
  },
  {
    method: 'get', 
    route: '/views/refresh',
    handler: (request?: ObservatoryBoardRequest) => watchers.view.refreshData(request)
  },
  {
    method: 'post',
    route: '/views/:id/related',
    handler: (request?: ObservatoryBoardRequest) => watchers.view.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/models',
    handler: (request?: ObservatoryBoardRequest) => watchers.model.getIndex(request)
  },
  {
    method: 'get',
    route: '/models/:id',
    handler: (request?: ObservatoryBoardRequest) => watchers.model.getView(request)
  },
  {
    method: 'post',
    route: '/models/:id/related',
    handler: (request?: ObservatoryBoardRequest) => watchers.model.getRelatedData(request)
  },
  {
    method: 'get',
    route: '/models/refresh',
    handler: (request?: ObservatoryBoardRequest) => watchers.model.refreshData(request)
  }
];

export default apiRoutes;
