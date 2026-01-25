/** @format */

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StoreContext } from "@/store";
import { useParams } from "react-router";
import { useResourceHooks } from "./useApiTyped";
import { components } from "@/types/api";

type ListResponse = components["schemas"]["ListResponse"];
type IndexType = components["schemas"]["IndexType"];

type Props = {
  key: string;
  defaultInstanceStatusType: string;
};

export const useIndexTableData = <TInstance, TGroup>({
  key,
  defaultInstanceStatusType,
}: Props) => {
  const { state } = useContext(StoreContext);
  const modelKey = useParams<{ key: string }>().key || "";

  const [instanceData, setInstanceData] = useState<TInstance[]>([]);
  const [groupData, setGroupData] = useState<TGroup[]>([]);

  const [instanceDataCount, setInstanceDataCount] = useState<string>("0");
  const [groupDataCount, setGroupDataCount] = useState<string>("0");

  const offsetRef = useRef(0);

  // UI States
  const [index, setIndex] = useState<IndexType>("group");
  const [instanceStatusType, setInstanceStatusType] = useState<string>(
    defaultInstanceStatusType,
  );

  const [inputValue, setInputValue] = useState("");
  const [noMoreItems, setNoMoreItems] = useState(false);
  const [sidePanelData, setSidePanelData] = useState<{
    isOpen: boolean;
    modelId?: string;
    requestId?: string;
    scheduleId?: string;
    jobId?: string;
  }>({
    isOpen: false,
    modelId: "",
    requestId: "",
    jobId: "",
    scheduleId: "",
  });
  const [loading, setLoading] = useState(false);

  const resourceHooks = useResourceHooks(key);

  useEffect(() => {
    if (index === "instance") setInstanceStatusType(defaultInstanceStatusType);
    if (modelKey) setIndex("instance");
    else setIndex("group");
  }, [modelKey, defaultInstanceStatusType]);

  useEffect(() => {
    offsetRef.current = 0;
    if (index === "instance") {
      getDataByInstance();
    } else {
      getDataByGroup();
    }
  }, [index, state.period, instanceStatusType, inputValue, modelKey]);

  const getDataByGroup = useCallback(
    async (addedNewItems = false) => {
      if (addedNewItems) offsetRef.current += 20;

      try {
        setLoading(true);
        const statusArray = instanceStatusType
          ?.split(",")
          .map((s: string) => s.toLowerCase())
          .join(",");

        const period =
          typeof state.period === "string" ? state.period : undefined;

        const { data, isLoading, error } = await resourceHooks.useList({
          offset: offsetRef.current,
          limit: 20,
          index: "group",
          period,
          q: inputValue || undefined,
          status: statusArray || undefined,
          table: true,
        });

        const listData = data as ListResponse;
        const results = (listData?.results ?? []) as TGroup[];
        const count = listData?.count ?? "0";

        setNoMoreItems(results.length < 20);
        setGroupData(addedNewItems ? [...groupData, ...results] : results);
        setGroupDataCount(count);
      } catch (error) {
        console.error("Failed to fetch group data:", error);
      } finally {
        setLoading(false);
      }
    },
    [resourceHooks, instanceStatusType, inputValue, state.period, groupData],
  );

  const getDataByInstance = useCallback(
    async (addedNewItems = false) => {
      if (addedNewItems) offsetRef.current += 20;

      try {
        setLoading(true);

        const period =
          typeof state.period === "string" ? state.period : undefined;

        const { data, isLoading, error } = await resourceHooks.useList({
          offset: offsetRef.current,
          limit: 20,
          index: "instance",
          period,
          q: inputValue || undefined,
          key: modelKey || undefined,
          status: instanceStatusType.toLowerCase(),
          table: true,
        });

        const listData = data as ListResponse;
        const results = (listData?.results ?? []) as TInstance[];
        const count = listData?.count ?? "0";

        setNoMoreItems(results.length < 20);
        setInstanceData(
          addedNewItems ? [...instanceData, ...results] : results,
        );
        setInstanceDataCount(count);
      } catch (error) {
        console.error("Failed to fetch instance data:", error);
      } finally {
        setLoading(false);
      }
    },
    [
      resourceHooks,
      inputValue,
      modelKey,
      state.period,
      instanceStatusType,
      instanceData,
    ],
  );

  const loadData = useCallback(() => {
    if (index === "instance") {
      getDataByInstance(true);
    } else {
      getDataByGroup(true);
    }
  }, [index, getDataByInstance, getDataByGroup]);

  const message = useMemo(() => {
    return index === "instance"
      ? instanceDataCount === "0"
        ? "No entries available"
        : noMoreItems
          ? "No more entries"
          : null
      : groupDataCount === "0"
        ? "No entries available"
        : noMoreItems
          ? "No more entries"
          : null;
  }, [index, instanceDataCount, groupDataCount, noMoreItems]);

  return {
    instanceData: instanceData as TInstance[],
    groupData: groupData as TGroup[],
    instanceDataCount,
    groupDataCount,
    index,
    instanceStatusType,
    inputValue,
    sidePanelData,
    message,
    modelKey,
    loading,
    offsetRef,
    setInputValue,
    loadData,
    setSidePanelData,
    setInstanceStatusType,
    setIndex,
  };
};
