/** @format */

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
  console.log(`Registering routes for ${path} -> ${watcherKey}`);
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
      route: `/api/${path}/graph`,
      handler: (
        request: ObservatoryBoardRequest,
      ): Promisify<ControllerHandlerReturnType> =>
        watchers[watcherKey].indexGraph(request),
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
        console.log('hit')
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
    route: "/api/",
    handler: (
      request: ObservatoryBoardRequest,
    ): Promisify<ControllerHandlerReturnType> =>
      watchers.dashboard?.indexTable(request) ||
      Promise.resolve({
        body: { error: "Dashboard not initialized" },
        statusCode: 503,
      }),
  },
  ...ROUTE_CONFIG.flatMap(({ path, watcher }) =>
    generateRoutesForResource(path, watcher),
  ),
];

export default apiRoutes;
