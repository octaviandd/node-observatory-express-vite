/** @format */

import { dashboardController } from "../dashboard.js";
import { watchers } from "../index.js";

const ROUTE_CONFIG = [
  { path: "requests", watcher: "requests" },
  { path: "queries", watcher: "query" },
  { path: "notifications", watcher: "notifications" },
  { path: "mails", watcher: "mailer" },
  { path: "exceptions", watcher: "errors" },
  { path: "jobs", watcher: "jobs" },
  { path: "schedules", watcher: "scheduler" },
  { path: "https", watcher: "http" },
  { path: "cache", watcher: "cache" },
  { path: "logs", watcher: "logging" },
  { path: "views", watcher: "view" },
  { path: "models", watcher: "model" },
] as const;

function generateRoutesForResource(
  path: string,
  watcherKey: string,
): AppControllerRoute[] {
  return [
    {
      method: "get",
      route: `/api/${path}/table`,
      handler: (
        request: ObservatoryBoardRequest,
      ): Promisify<ControllerHandlerReturnType> =>
        watchers[watcherKey].indexTable(request),
    },
    {
      method: "get",
      route: `/api/${path}/count-graph`,
      handler: (
        request: ObservatoryBoardRequest,
      ): Promisify<ControllerHandlerReturnType> =>
        watchers[watcherKey].countGraph(request),
    },
    {
      method: "get",
      route: `/api/${path}/duration-graph`,
      handler: (
        request: ObservatoryBoardRequest,
      ): Promisify<ControllerHandlerReturnType> =>
        watchers[watcherKey].durationGraph(request),
    },
    {
      method: "get",
      route: `/api/${path}/:id`,
      handler: (
        request: ObservatoryBoardRequest,
      ): Promisify<ControllerHandlerReturnType> =>
        watchers[watcherKey].view(request),
    },
    {
      method: "post",
      route: `/api/${path}/:id/related`,
      handler: (
        request: ObservatoryBoardRequest,
      ): Promisify<ControllerHandlerReturnType> => {
        return watchers[watcherKey].metadata(request)
      }
    },
    {
      method: "get",
      route: `/api/${path}/refresh`,
      handler: (
        request: ObservatoryBoardRequest,
      ): Promisify<ControllerHandlerReturnType> =>
        watchers[watcherKey].refresh(),
    },
  ];
}

const apiRoutes: AppControllerRoute[] = [
  {
    method: "get",
    route: "/api/dashboard",
    handler: (
      request: ObservatoryBoardRequest,
    ): Promisify<ControllerHandlerReturnType> => dashboardController.getDashboardData(request)},
  ...ROUTE_CONFIG.flatMap(({ path, watcher }) =>
    generateRoutesForResource(path, watcher),
  ),
];

export default apiRoutes;
