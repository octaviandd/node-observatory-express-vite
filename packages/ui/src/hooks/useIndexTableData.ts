/** @format */

import { useContext, useState, useMemo, useEffect } from "react";
import { StoreContext } from "@/store";
import { useParams } from "react-router";
import { AllGroupResponses, AllInstanceResponses, useResourceHooks, type ResourceKey } from "./useApiTyped";
import { components } from "@/types/api";

type IndexType = components["schemas"]["IndexType"];

type Props = {
  key: ResourceKey;
  defaultInstanceStatusType: string;
};

export type DrawerState = {
  isOpen: boolean;
  modelId: string;
  requestId: string
  jobId: string
  scheduleId: string
}

export const useIndexTableData = <TInstance extends AllInstanceResponses, TGroup extends AllGroupResponses>(
  { key, defaultInstanceStatusType }: Props) => {
  const { state } = useContext(StoreContext);
  const modelKey = useParams<{ key: string }>().key || "";
  const resourceHooks = useResourceHooks(key);

  // UI state
  const [index, setIndex] = useState<IndexType>(modelKey ? "instance" : "group");
  const [instanceStatusType, setInstanceStatusType] = useState(defaultInstanceStatusType);
  const [inputValue, setInputValue] = useState("");
  const [drawer, setDrawer] = useState<DrawerState>({
    isOpen: false,
    modelId: "",
    requestId: "",
    jobId: "",
    scheduleId: "",
  });

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

  const message = useMemo(() => {
    if (activeCount === "0") return "No entries available";
    if (!activeQuery.hasNextPage) return "No more entries";
    return null;
  }, [activeCount, activeQuery.hasNextPage]);

  return {
    instanceData,
    groupData,
    instanceDataCount,
    groupDataCount,
    index,
    instanceStatusType,
    inputValue,
    drawer,
    message,
    modelKey,
    loading: activeQuery.isLoading,
    isFetchingMore: activeQuery.isFetchingNextPage,
    hasNextPage: activeQuery.hasNextPage,
    loadMore: activeQuery.fetchNextPage,
    setInputValue,
    setDrawer,
    setInstanceStatusType,
    setIndex,
  };
};