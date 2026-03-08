/** @format */

import { useResourceHooks, type ResourceKey } from "./useApiTyped";
import { useFilters } from "./useFilterContext";
import { components } from "@/types/api";

type CountGraphDataResponse = components["schemas"]["CountGraphDataResponse"];
type DurationGraphDataResponse = components["schemas"]["DurationGraphDataResponse"];

type Props = {
  key: ResourceKey;
};

export type CountGraphDataResult = {
  data: CountGraphDataResponse | undefined;
  loading: boolean;
};

export type DurationGraphDataResult = {
  data: DurationGraphDataResponse | undefined;
  loading: boolean;
};

export const useCountGraphData = ({ key }: Props): CountGraphDataResult => {
  const { instanceStatusType, inputValue, modelKey } = useFilters();
  const resourceHooks = useResourceHooks(key);

  const graphQuery = resourceHooks.useCountGraph({
    q: inputValue || undefined,
    key: modelKey || undefined,
    status: instanceStatusType?.toLowerCase(),
  });

  return {
    data: graphQuery.data,
    loading: graphQuery.isLoading,
  };
};

export const useDurationGraphData = ({ key }: Props): DurationGraphDataResult => {
  const { instanceStatusType, inputValue, modelKey } = useFilters();
  const resourceHooks = useResourceHooks(key);

  const graphQuery = resourceHooks.useDurationGraph({
    q: inputValue || undefined,
    key: modelKey || undefined,
    status: instanceStatusType?.toLowerCase(),
  });

  return {
    data: graphQuery.data,
    loading: graphQuery.isLoading,
  };
};