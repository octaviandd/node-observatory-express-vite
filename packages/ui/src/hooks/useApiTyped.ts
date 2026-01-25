/** @format */

import { useContext } from "react";
import { StoreContext } from "@/store";
import {
  useApiQuery,
  useApiMutation,
  UseApiQueryOptions,
  UseApiMutationOptions,
} from "./useApi";
import { components } from "@/types/api";

type ListResponse = components["schemas"]["ListResponse"];
type Period = components["schemas"]["Period"];
type IndexType = components["schemas"]["IndexType"];

interface ResourceQueryParams {
  offset?: number;
  limit?: number;
  period?: Period;
  index?: IndexType;
  q?: string;
  table?: boolean;
  status?: string;
  key?: string;
}

// Dashboard
export function useDashboard(options?: UseApiQueryOptions<ListResponse>) {
  return useApiQuery<ListResponse>("/api/", ["dashboard"], options);
}

// Generic resource hooks factory
function createResourceHooks(resource: string) {
  return {
    // List resource
    useList: (
      params: ResourceQueryParams = {},
      options?: UseApiQueryOptions<ListResponse>,
    ) => {
      const queryString = new URLSearchParams();
      if (params.offset !== undefined)
        queryString.set("offset", String(params.offset));
      if (params.limit !== undefined)
        queryString.set("limit", String(params.limit));
      if (params.period) queryString.set("period", params.period);
      if (params.index) queryString.set("index", params.index);
      if (params.q) queryString.set("q", params.q);
      if (params.table !== undefined)
        queryString.set("table", String(params.table));
      if (params.status) queryString.set("status", params.status);
      if (params.key) queryString.set("key", params.key);

      const endpoint = `/api/${resource}${queryString.toString() ? `?${queryString.toString()}` : ""}`;
      return useApiQuery<ListResponse>(
        endpoint,
        [resource, "list", params],
        options,
      );
    },

    // Get single resource
    useGet: (
      id: string | undefined,
      options?: UseApiQueryOptions<Record<string, unknown>>,
    ) => {
      return useApiQuery<Record<string, unknown>>(
        `/api/${resource}/${id}`,
        [resource, "get", id],
        { ...options, enabled: !!id },
      );
    },

    // Get related metadata
    useRelated: (
      id: string | undefined,
      options?: UseApiMutationOptions<
        Record<string, unknown>,
        Record<string, unknown>
      >,
    ) => {
      const mutation = useApiMutation<
        Record<string, unknown>,
        Record<string, unknown>
      >(`/api/${resource}/${id}/related`, "POST", options);
      return mutation;
    },

    // Refresh resource
    useRefresh: (options?: UseApiQueryOptions<{ message?: string }>) => {
      return useApiQuery<{ message?: string }>(
        `/api/${resource}/refresh`,
        [resource, "refresh"],
        options,
      );
    },
  };
}

// Create hooks for each resource type
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

// Hook to get resource hooks dynamically
export function useResourceHooks(type: string) {
  const hooks = {
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

  return hooks[type as keyof typeof hooks];
}

// Helper hook to use with period from store
export function useResourceWithPeriod(
  type: string,
  params: Omit<ResourceQueryParams, "period"> = {},
  options?: UseApiQueryOptions<ListResponse>,
) {
  const { state } = useContext(StoreContext);
  const hooks = useResourceHooks(type);

  return hooks?.useList(
    {
      ...params,
      period: state.period as Period,
    },
    options,
  );
}
