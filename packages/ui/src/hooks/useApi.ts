/** @format */

import { useContext } from "react";
import {
  QueryClient,
  useQuery,
  useMutation,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseMutationOptions,
  type UseInfiniteQueryOptions,
  type QueryKey,
  type InfiniteData
} from "@tanstack/react-query";
export { QueryClientProvider } from "@tanstack/react-query";
import { StoreContext, type PeriodState, type CustomDateRange } from "@/store";

// ============================================================================
// Query Client
// ============================================================================

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ============================================================================
// Helpers
// ============================================================================

//@ts-ignore
const getBaseUrl = (): string => window.SERVER_CONFIG?.base ?? "";

const buildPeriodParams = (period: PeriodState): string => {
  if (typeof period === "string") {
    return `period=${period}`;
  }
  const { startDate, endDate } = period as CustomDateRange;
  return `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
};

// ============================================================================
// Error
// ============================================================================

export class ApiError extends Error {
  status: number;
  statusText: string;
  data?: unknown;

  constructor(
    message: string,
    status: number,
    statusText: string,
    data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

// ============================================================================
// Fetcher
// ============================================================================

async function fetcher<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

  console.log('🔥 FETCHER CALLED');
  console.log('Endpoint:', endpoint);
  console.log('Base URL:', baseUrl);
  console.log('Full URL:', url);
  console.log('Method:', options?.method);
  console.log('Body:', options?.body);

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }
    console.log(response);

    throw new ApiError(
      `API Error: ${response.status} ${response.statusText}`,
      response.status,
      response.statusText,
      errorData,
    );
  }

  return response.json();
}

// ============================================================================
// useApiQuery
// ============================================================================

export interface UseApiQueryOptions<TData> extends Omit<
  UseQueryOptions<TData, ApiError>,
  "queryKey" | "queryFn"
> {
  includePeriod?: boolean;
}

export function useApiQuery<TData = unknown>(
  endpoint: string,
  queryKey: QueryKey,
  options?: UseApiQueryOptions<TData>,
) {
  const { state } = useContext(StoreContext);
  const { includePeriod = true, ...queryOptions } = options ?? {};

  const fullEndpoint = includePeriod
    ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}${buildPeriodParams(state.period)}`
    : endpoint;

  return useQuery<TData, ApiError>({
    queryKey: includePeriod ? [...queryKey, state.period] : queryKey,
    queryFn: () => fetcher<TData>(fullEndpoint),
    ...queryOptions,
  });
}

// ============================================================================
// useApiMutation
// ============================================================================

export interface UseApiMutationOptions<TData, TVariables> extends Omit<
  UseMutationOptions<TData, ApiError, TVariables>,
  "mutationFn"
> {}

export function useApiMutation<TData = unknown, TVariables = unknown>(
  endpoint: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
  options?: UseApiMutationOptions<TData, TVariables>,
) {
  return useMutation<TData, ApiError, TVariables>({
    mutationFn: (variables) =>
      fetcher<TData>(endpoint, {
        method,
        body: JSON.stringify(variables),
      }),
    ...options,
  });
}

// ============================================================================
// useApiInfiniteQuery
// ============================================================================

export interface PaginatedResponse<T> {
  results: T[];
  count: string;
}

export interface UseApiInfiniteQueryOptions<TData> extends Omit<UseInfiniteQueryOptions <PaginatedResponse<TData>,ApiError,InfiniteData<PaginatedResponse<TData>>,QueryKey,number>,
  "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
> {
  includePeriod?: boolean;
  pageSize?: number;
}

export function useApiInfiniteQuery<TData = unknown>(
  endpoint: string,
  queryKey: QueryKey,
  options?: UseApiInfiniteQueryOptions<TData>,
) {
  const { state } = useContext(StoreContext);
  const {
    includePeriod = true,
    pageSize = 20,
    ...queryOptions
  } = options ?? {};

  return useInfiniteQuery<
    PaginatedResponse<TData>,
    ApiError,
    InfiniteData<PaginatedResponse<TData>>,
    QueryKey,
    number
  >({
    queryKey: includePeriod ? [...queryKey, state.period] : queryKey,
    queryFn: ({ pageParam = 0 }) => {
      const separator = endpoint.includes("?") ? "&" : "?";
      const periodParams = includePeriod
        ? `&${buildPeriodParams(state.period)}`
        : "";
      const fullEndpoint = `${endpoint}${separator}offset=${pageParam}${periodParams}`;
      return fetcher<PaginatedResponse<TData>>(fullEndpoint);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce(
        (acc, page) => acc + page.results.length,
        0,
      );
      const hasMore = lastPage.results.length === pageSize;
      return hasMore ? totalFetched : undefined;
    },
    ...queryOptions,
  });
}

// ============================================================================
// Exports
// ============================================================================

export { fetcher, buildPeriodParams, getBaseUrl };