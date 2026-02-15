/** @format */

import {
  useApiQuery,
  useApiInfiniteQuery,
  useApiMutation,
  UseApiQueryOptions,
  UseApiMutationOptions,
} from "./useApi";
import { components } from "@/types/api";

// ============================================================================
// Types from OpenAPI
// ============================================================================

type Period = components["schemas"]["Period"];
type IndexType = components["schemas"]["IndexType"];
type GraphDataResponse = components["schemas"]["GraphDataResponse"];
type ViewDataResponse = components["schemas"]["ViewDataResponse"];

// ============================================================================
// Resource Response Maps
// ============================================================================

export type RequestInstanceResponse = components["schemas"]["RequestInstanceResponse"];
export type QueryInstanceResponse = components["schemas"]["QueryInstanceResponse"];
export type ScheduleInstanceResponse = components["schemas"]["ScheduleInstanceResponse"];
export type LogInstanceResponse = components["schemas"]["LogInstanceResponse"];
export type ExceptionInstanceResponse = components["schemas"]["ExceptionInstanceResponse"];
export type NotificationInstanceResponse = components["schemas"]["NotificationInstanceResponse"];
export type CacheInstanceResponse = components["schemas"]["CacheInstanceResponse"];
export type ViewInstanceResponse = components["schemas"]["ViewInstanceResponse"];
export type ModelInstanceResponse = components["schemas"]["ModelInstanceResponse"];
export type MailInstanceResponse = components["schemas"]["MailInstanceResponse"];
export type HttpClientInstanceResponse = components["schemas"]["HttpClientInstanceResponse"];
export type JobInstanceResponse = components["schemas"]["JobInstanceResponse"];

export type RequestGroupResponse = components["schemas"]["RequestGroupResponse"];
export type QueryGroupResponse = components["schemas"]["QueryGroupResponse"];
export type ScheduleGroupResponse = components["schemas"]["ScheduleGroupResponse"];
export type LogGroupResponse = components["schemas"]["LogGroupResponse"];
export type ExceptionGroupResponse = components["schemas"]["ExceptionGroupResponse"];
export type NotificationGroupResponse = components["schemas"]["NotificationGroupResponse"];
export type CacheGroupResponse = components["schemas"]["CacheGroupResponse"];
export type ViewGroupResponse = components["schemas"]["ViewGroupResponse"];
export type ModelGroupResponse = components["schemas"]["ModelGroupResponse"];
export type MailGroupResponse = components["schemas"]["MailGroupResponse"];
export type HttpClientGroupResponse = components["schemas"]["HttpClientGroupResponse"];
export type JobGroupResponse = components["schemas"]["JobGroupResponse"];


type ResourceInstanceMap = {
  requests: components["schemas"]["RequestInstanceResponse"];
  queries: components["schemas"]["QueryInstanceResponse"];
  notifications: components["schemas"]["NotificationInstanceResponse"];
  mails: components["schemas"]["MailInstanceResponse"];
  exceptions: components["schemas"]["ExceptionInstanceResponse"];
  jobs: components["schemas"]["JobInstanceResponse"];
  schedules: components["schemas"]["ScheduleInstanceResponse"];
  https: components["schemas"]["HttpClientInstanceResponse"];
  cache: components["schemas"]["CacheInstanceResponse"];
  logs: components["schemas"]["LogInstanceResponse"];
  views: components["schemas"]["ViewInstanceResponse"];
  models: components["schemas"]["ModelInstanceResponse"];
};

type ResourceGroupMap = {
  requests: components["schemas"]["RequestGroupResponse"];
  queries: components["schemas"]["QueryGroupResponse"];
  notifications: components["schemas"]["NotificationGroupResponse"];
  mails: components["schemas"]["MailGroupResponse"];
  exceptions: components["schemas"]["ExceptionGroupResponse"];
  jobs: components["schemas"]["JobGroupResponse"];
  schedules: components["schemas"]["ScheduleGroupResponse"];
  https: components["schemas"]["HttpClientGroupResponse"];
  cache: components["schemas"]["CacheGroupResponse"];
  logs: components["schemas"]["LogGroupResponse"];
  views: components["schemas"]["ViewGroupResponse"];
  models: components["schemas"]["ModelGroupResponse"];
};

export type AllInstanceResponses = ResourceInstanceMap[keyof ResourceInstanceMap];
export type AllGroupResponses = ResourceGroupMap[keyof ResourceGroupMap];

export type ResourceKey = keyof ResourceInstanceMap;

// ============================================================================
// Helper Types
// ============================================================================

type TableResult<K extends ResourceKey, I extends IndexType> =
  I extends "instance" ? ResourceInstanceMap[K] : ResourceGroupMap[K];

// ============================================================================
// Query Param Interfaces
// ============================================================================

interface TableQueryParams {
  index: IndexType;
  period?: Period;
  offset?: number;
  limit?: number;
  q?: string;
  status?: string;
  key?: string;
  queue?: string;
  groupFilter?: string;
}

interface GraphQueryParams {
  period?: Period;
  q?: string;
  status?: string;
  key?: string;
}

// ============================================================================
// Resource Hooks Factory
// ============================================================================

function createResourceHooks<K extends ResourceKey>(resource: K) {
  return {
    // Table data - paginated, returns instance or group based on index
    useTable: <I extends IndexType>(
      params: TableQueryParams & { index: I },
      options?: Omit<UseApiQueryOptions<TableResult<K, I>[]>, "throwOnError">,
    ) => {
      const searchParams = new URLSearchParams({
        index: params.index,
        ...(params.period && { period: params.period }),
        ...(params.q && { q: params.q }),
        ...(params.status && { status: params.status }),
        ...(params.key && { key: params.key }),
        ...(params.queue && { queue: params.queue }),
        ...(params.groupFilter && { groupFilter: params.groupFilter }),
      });

      const endpoint = `/api/${resource}/table?${searchParams.toString()}`;

      return useApiInfiniteQuery<TableResult<K, I>>(
        endpoint,
        [resource, "table", params],
        //@ts-ignore
        {
          pageSize: params.limit ?? 20,
          ...options,
        },
      );
    },

    // Graph data - single fetch, returns GraphDataResponse
    useGraph: (
      params: GraphQueryParams = {},
      options?: UseApiQueryOptions<GraphDataResponse>,
    ) => {
      const searchParams = new URLSearchParams({
        ...(params.period && { period: params.period }),
        ...(params.q && { q: params.q }),
        ...(params.status && { status: params.status }),
        ...(params.key && { key: params.key }),
      });

      const query = searchParams.toString();
      const endpoint = `/api/${resource}/graph${query ? `?${query}` : ""}`;

      return useApiQuery<GraphDataResponse>(
        endpoint,
        [resource, "graph", params],
        options,
      );
    },

    // Single item by ID
    useGet: (
      id: string | undefined,
      options?: UseApiQueryOptions<ViewDataResponse>,
    ) => {
      return useApiQuery<ViewDataResponse>(
        `/api/${resource}/${id}`,
        [resource, "get", id],
        { ...options, enabled: !!id, includePeriod: false },
      );
    },

    // Related metadata
    useRelated: (
      id: string | undefined,
      options?: UseApiMutationOptions<ViewDataResponse, ViewDataResponse>,
    ) => {
      return useApiMutation<ViewDataResponse, ViewDataResponse>(
        `/api/${resource}/${id}/related`,
        "POST",
        options,
      );
    },

    // Refresh watcher
    useRefresh: (options?: UseApiQueryOptions<{ message: string }>) => {
      return useApiQuery<{ message: string }>(
        `/api/${resource}/refresh`,
        [resource, "refresh"],
        { ...options, includePeriod: false },
      );
    },
  };
}

// ============================================================================
// Export Hooks
// ============================================================================

export const useRequests = createResourceHooks("requests");
export const useQueries = createResourceHooks("queries");
export const useNotifications = createResourceHooks("notifications");
export const useMails = createResourceHooks("mails");
export const useExceptions = createResourceHooks("exceptions");
export const useJobs = createResourceHooks("jobs");
export const useSchedules = createResourceHooks("schedules");
export const useHttps = createResourceHooks("https");
export const useCaches = createResourceHooks("cache");
export const useLogs = createResourceHooks("logs");
export const useViews = createResourceHooks("views");
export const useModels = createResourceHooks("models");

// ============================================================================
// Dynamic Lookup
// ============================================================================

const hooksByType = {
  requests: useRequests,
  queries: useQueries,
  notifications: useNotifications,
  mails: useMails,
  exceptions: useExceptions,
  jobs: useJobs,
  schedules: useSchedules,
  https: useHttps,
  cache: useCaches,
  logs: useLogs,
  views: useViews,
  models: useModels,
} as const;

export function useResourceHooks(type: ResourceKey) {
  return hooksByType[type];
}

// ============================================================================
// Dashboard
// ============================================================================

type DashboardResponse = any; // TODO: define once dashboard endpoint is typed

export function useDashboard(options?: UseApiQueryOptions<DashboardResponse>) {
  return useApiQuery<DashboardResponse>("/api/", ["dashboard"], options);
}