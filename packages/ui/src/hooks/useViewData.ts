/** @format */

import { RequestInstanceResponse, JobInstanceResponse, ScheduleInstanceResponse } from "@/hooks/useApiTyped";
import { useState, useEffect } from "react";
import { useParams } from "react-router";

interface UseViewDataOptions {
  /** The API endpoint (e.g., "http", "mails", "queries") */
  endpoint: string;
  /** The key in the API response that contains the main data */
  dataKey: string;
}

interface UseViewDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  source: RequestInstanceResponse | JobInstanceResponse | ScheduleInstanceResponse | null;
  /** The full raw response from the API for accessing additional data */
  rawResponse: Record<string, unknown> | null;
}

export function useViewData<T>({
  endpoint,
  dataKey,
}: UseViewDataOptions): UseViewDataResult<T> {
  const params = useParams();
  const [state, setState] = useState<UseViewDataResult<T>>({
    data: null,
    loading: true,
    error: null,
    source: null,
    rawResponse: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      
      try {
        const response = await fetch(
          //@ts-ignore
          `${window.SERVER_CONFIG.base}/api/${endpoint}/${params.id}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${dataKey} data`);
        }
        
        const result = await response.json();
        const { request, job, schedule } = result;
        const mainData = result[dataKey];

        if (!mainData || (Array.isArray(mainData) && mainData.length === 0)) {
          throw new Error(`${dataKey} data not found`);
        }

        // If the data is an array, take the first item
        const data = Array.isArray(mainData) ? mainData[0] : mainData;

        // Determine source (priority: request > job > schedule)
        const source = request?.[0] ?? job?.[0] ?? schedule?.[0] ?? null;

        setState({
          data,
          loading: false,
          error: null,
          source,
          rawResponse: result,
        });
      } catch (error) {
        console.error(`Error fetching ${dataKey} data:`, error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "An error occurred",
        }));
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id, endpoint, dataKey]);

  return state;
}

