/** @format */

import { useState, useMemo, useEffect } from "react";
import { useParams, useSearchParams } from "react-router";
import { AllGroupResponses, AllInstanceResponses, useResourceHooks, type ResourceKey } from "./useApiTyped";
import { components } from "@/types/api";
import { queryClient } from "./useApi";

type IndexType = components["schemas"]["IndexType"];

type Props = {
  key: ResourceKey;
  defaultInstanceStatusType: string;
};

export const useTableData =<TInstance extends AllInstanceResponses, TGroup extends AllGroupResponses> ({ key, defaultInstanceStatusType }: Props) => {
  const modelKey = useParams<{ key: string }>().key || "";
  const resourceHooks = useResourceHooks(key);
  const [searchParams, setSearchParams] = useSearchParams();

  const urlIndex = searchParams.get("index") as IndexType | null;
  const urlStatus = searchParams.get("status");
  const urlQuery = searchParams.get("q");

  // UI state
  const [index, setIndex] = useState<IndexType>(
    urlIndex || (modelKey ? "instance" : "group")
  );
  const [instanceStatusType, setInstanceStatusType] = useState(
    urlStatus || defaultInstanceStatusType
  );
  const [inputValue, setInputValue] = useState(urlQuery || "");
  

   // Sync state to URL whenever filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (index !== "group") params.set("index", index);
    if (modelKey) params.set("key", modelKey);
    if (instanceStatusType !== defaultInstanceStatusType) {
      params.set("status", instanceStatusType);
    }

    console.log(instanceStatusType)
    if (inputValue) params.set("q", inputValue);

    // Only update URL if params actually changed
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [index, modelKey, instanceStatusType, inputValue, defaultInstanceStatusType]);

  // Reset state when modelKey changes
  useEffect(() => {
    setIndex(modelKey ? "instance" : "group");
    setInstanceStatusType(defaultInstanceStatusType);
    setInputValue("");
    
    // Invalidate queries to trigger refetch
    queryClient.invalidateQueries({ queryKey: [key, "table"] });
  }, [modelKey, key, defaultInstanceStatusType]);

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

  useEffect(() => {
    setIndex(modelKey ? "instance" : "group");
  }, [modelKey]);

  const groupData = useMemo(() =>
      //@ts-ignore
      (groupQuery.data?.pages ?? []).flatMap((page) => page.results),
    [groupQuery.data],
  );

  const instanceDataCount = instanceQuery.data?.pages?.at(-1)?.count ?? "0";
  const groupDataCount = groupQuery.data?.pages?.at(-1)?.count ?? "0";

  const activeQuery = index === "instance" ? instanceQuery : groupQuery;
  const activeCount = index === "instance" ? instanceDataCount : groupDataCount;

  const message = activeCount === "0" ? "No entries available" : !activeQuery.hasNextPage ? "No more entries" : "";

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