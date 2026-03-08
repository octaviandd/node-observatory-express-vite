/** @format */

import { useMemo } from "react";
import { useResourceHooks, type ResourceKey } from "./useApiTyped";
import { useFilters } from "./useFilterContext";

type Props = {
  key: ResourceKey;
};

export type TableDataResult = {
  instanceData: unknown;
  groupData: unknown;
  instanceDataCount: string;
  groupDataCount: string;
  index: string;
  instanceStatusType: string;
  inputValue: string;
  message: string;
  modelKey: string;
  loading: boolean;
  isFetchingMore: boolean;
  hasNextPage: boolean;
  loadMore: () => void;
  setInputValue: (val: string) => void;
  setInstanceStatusType: (val: string) => void;
  setIndex: (val: any) => void;
};

export const useTableData = ({ key }: Props): TableDataResult => {
  const { 
    index, 
    instanceStatusType, 
    inputValue, 
    modelKey,
    setIndex,
    setInstanceStatusType,
    setInputValue 
  } = useFilters();

  const resourceHooks = useResourceHooks(key);

  const instanceQuery = resourceHooks.useTable<"instance">(
    {
      index: "instance",
      q: inputValue || undefined,
      key: modelKey || undefined,
      status: instanceStatusType?.toLowerCase(),
    },
    { enabled: index === "instance" },
  );

  const groupQuery = resourceHooks.useTable<"group">(
    {
      index: "group",
      q: inputValue || undefined,
      status: instanceStatusType?.toLowerCase(),
    },
    { enabled: index === "group" },
  );

  const instanceData = useMemo(() =>
      //@ts-ignore
      (instanceQuery.data?.pages ?? []).flatMap((page) => page.results),
    [instanceQuery.data],
  );

  const groupData = useMemo(() =>
      //@ts-ignore
      (groupQuery.data?.pages ?? []).flatMap((page) => page.results),
    [groupQuery.data],
  );

  const instanceDataCount = instanceQuery.data?.pages?.at(-1)?.count ?? "0";
  const groupDataCount = groupQuery.data?.pages?.at(-1)?.count ?? "0";

  const activeQuery = index === "instance" ? instanceQuery : groupQuery;
  const activeCount = index === "instance" ? instanceDataCount : groupDataCount;

  const message = useMemo(() => {
    if (activeCount === "0") return "No entries available";
    if (!activeQuery.hasNextPage) return "No more entries";
    return "";
  }, [activeCount, activeQuery.hasNextPage]);

  return {
    instanceData,
    groupData,
    instanceDataCount,
    groupDataCount,
    index,
    instanceStatusType,
    inputValue,
    message,
    modelKey,
    loading: activeQuery.isLoading,
    isFetchingMore: activeQuery.isFetchingNextPage,
    hasNextPage: activeQuery.hasNextPage,
    loadMore: activeQuery.fetchNextPage,
    setInputValue,
    setInstanceStatusType,
    setIndex,
  };
};