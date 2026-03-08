/** @format */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router";
import Dashboard from "./components/ui/dashboard";
import { StoreProvider } from "./store";
import MainLayout from "./App";
import { ScrollArea } from "@/components/ui/base/scroll-area";
import { queryClient, QueryClientProvider } from "@/hooks/useApi";

const screens = {
  mail: { Index: () => import("./screens/mail/index"), View: () => import("./screens/mail/view/view") },
  exception: { Index: () => import("./screens/exception/index"), View: () => import("./screens/exception/view/view") },
  notification: { Index: () => import("./screens/notification/index"), View: () => import("./screens/notification/view/view") },
  job: { Index: () => import("./screens/job/index"), View: () => import("./screens/job/view/view") },
  cache: { Index: () => import("./screens/cache/index"), View: () => import("./screens/cache/view/view") },
  query: { Index: () => import("./screens/query/index"), View: () => import("./screens/query/view/view") },
  model: { Index: () => import("./screens/model/index"), View: () => import("./screens/model/view/view") },
  request: { Index: () => import("./screens/request/index/index"), View: () => import("./screens/request/view/view") },
  schedule: { Index: () => import("./screens/schedule/index"), View: () => import("./screens/schedule/view/view") },
  http: { Index: () => import("./screens/http/index"), View: () => import("./screens/http/view/view") },
  log: { Index: () => import("./screens/log/index"), View: () => import("./screens/log/view/view") },
  view: { Index: () => import("./screens/view/index/index"), View: () => import("./screens/view/view/view") },
} as const;

import { lazy, Suspense } from "react";

const resourceRoutes = Object.entries(screens).flatMap(([name, { Index, View }]) => {
  const IndexComponent = lazy(Index);
  const ViewComponent = lazy(View);
  const plural = name === "query" ? "queries" 
    : name === "cache" ? "caches" 
    : name === "http" ? "https" 
    : `${name}s`;

  return [
    { path: `/${plural}`, element: <Suspense fallback={null}><IndexComponent /></Suspense> },
    { path: `/${plural}/:key`, element: <Suspense fallback={null}><IndexComponent /></Suspense> },
    { path: `/${name}/:id`, element: <Suspense fallback={null}><ViewComponent /></Suspense> },
  ];
});

const basePath = (window as any).SERVER_CONFIG?.base || '/ui';

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <MainLayout />,
      errorElement: <div>404</div>,
      children: [
        { index: true, element: <Dashboard /> },
        ...resourceRoutes,
      ],
    },
  ],
  { basename: basePath },
)

const scrollAreaClassName = "h-[calc(100vh-0.1px)]";

createRoot(document.getElementById("node-observatory") as HTMLDivElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <ScrollArea className={scrollAreaClassName}>
          <RouterProvider router={router} />
        </ScrollArea>
      </StoreProvider>
    </QueryClientProvider>
  </StrictMode>,
);