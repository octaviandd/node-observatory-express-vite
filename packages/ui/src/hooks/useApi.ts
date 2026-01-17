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
} from "@tanstack/react-query";
export { QueryClientProvider } from "@tanstack/react-query";
import { StoreContext, type PeriodState, type CustomDateRange } from "@/store";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const getBaseUrl = (): string => window.SERVER_CONFIG?.base ?? "";

const buildPeriodParams = (period: PeriodState): string => {
  if (typeof period === "string") {
    return `period=${period}`;
  }
  // Custom date range
  const { startDate, endDate } = period as CustomDateRange;
  return `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
};

export class ApiError extends Error {
  status: number;
  statusText: string;
  data?: unknown;

  constructor(message: string, status: number, statusText: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

async function fetcher<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

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
    throw new ApiError(
      `API Error: ${response.status} ${response.statusText}`,
      response.status,
      response.statusText,
      errorData
    );
  }

  return response.json();
}

interface UseApiQueryOptions<TData>
  extends Omit<UseQueryOptions<TData, ApiError>, "queryKey" | "queryFn"> {
  includePeriod?: boolean;
}

export function useApiQuery<TData = unknown>(
  endpoint: string,
  queryKey: QueryKey,
  options?: UseApiQueryOptions<TData>
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

interface UseApiMutationOptions<TData, TVariables>
  extends Omit<UseMutationOptions<TData, ApiError, TVariables>, "mutationFn"> {}

export function useApiMutation<TData = unknown, TVariables = unknown>(
  endpoint: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
  options?: UseApiMutationOptions<TData, TVariables>
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

interface PaginatedResponse<T> {
  results: T[];
  count: string;
}

interface UseApiInfiniteQueryOptions<TData>
  extends Omit<
    UseInfiniteQueryOptions<PaginatedResponse<TData>, ApiError, PaginatedResponse<TData>, QueryKey, number>,
    "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
  > {
  includePeriod?: boolean;
  pageSize?: number;
}

export function useApiInfiniteQuery<TData = unknown>(
  endpoint: string,
  queryKey: QueryKey,
  options?: UseApiInfiniteQueryOptions<TData>
) {
  const { state } = useContext(StoreContext);
  const { includePeriod = true, pageSize = 20, ...queryOptions } = options ?? {};

  return useInfiniteQuery<PaginatedResponse<TData>, ApiError, PaginatedResponse<TData>, QueryKey, number>({
    queryKey: includePeriod ? [...queryKey, state.period] : queryKey,
    queryFn: ({ pageParam = 0 }) => {
      const separator = endpoint.includes("?") ? "&" : "?";
      const periodParams = includePeriod ? `&${buildPeriodParams(state.period)}` : "";
      const fullEndpoint = `${endpoint}${separator}offset=${pageParam}${periodParams}`;
      return fetcher<PaginatedResponse<TData>>(fullEndpoint);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((acc, page) => acc + page.results.length, 0);
      const hasMore = lastPage.results.length === pageSize;
      return hasMore ? totalFetched : undefined;
    },
    ...queryOptions,
  });
}

export function useGraphData<TData = unknown>(
  type: string,
  key?: string
) {
  const endpoint = `/api/${type}${key ? `?key=${encodeURIComponent(key)}` : ""}`;
  return useApiQuery<TData>(endpoint, ["graph", type, key ?? "all"]);
}

export function useTableData<TData = unknown>(
  type: string,
  params: {
    index: "group" | "instance";
    status?: string;
    key?: string;
    query?: string;
  }
) {
  const { index, status, key, query } = params;
  
  const searchParams = new URLSearchParams({
    table: "true",
    index,
    ...(status && { status: status.toLowerCase() }),
    ...(key && { key }),
    ...(query && { q: query }),
  });

  const endpoint = `/api/${type}?${searchParams.toString()}`;
  
  return useApiInfiniteQuery<TData>(endpoint, [
    "table",
    type,
    index,
    status ?? "all",
    key ?? "all",
    query ?? "",
  ]);
}

export function useItemById<TData = unknown>(
  type: string,
  id: string | undefined,
  options?: UseApiQueryOptions<TData>
) {
  return useApiQuery<TData>(
    `/api/${type}/${id}`,
    [type, id ?? ""],
    {
      enabled: !!id,
      includePeriod: false,
      ...options,
    }
  );
}

export function useDeleteItem(type: string) {
  return useApiMutation<{ success: boolean }, { id: string }>(
    `/api/${type}`,
    "DELETE",
    {
      onSuccess: () => {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: [type] });
        queryClient.invalidateQueries({ queryKey: ["table", type] });
        queryClient.invalidateQueries({ queryKey: ["graph", type] });
      },
    }
  );
}

export { fetcher, buildPeriodParams, getBaseUrl };

