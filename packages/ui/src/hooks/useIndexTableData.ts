import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { StoreContext } from "@/store";
import { useParams } from "react-router";

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
  const [index, setIndex] = useState<"instance" | "group">("group");
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

  useEffect(() => {
    if (index === "instance") setInstanceStatusType(defaultInstanceStatusType);
    if (modelKey) setIndex("instance");
    else setIndex("group");
  }, [modelKey]);

  useEffect(() => {
    if (index === "instance") getDataByInstance();
    else getDataByGroup();
  }, [index, state.period, instanceStatusType, inputValue, modelKey]);

  const getDataByGroup = async (addedNewItems = false) => {
    if (addedNewItems) offsetRef.current += 20;

    const url = `/ui/api/${key}?table=true&offset=${offsetRef.current}&index=${index}&period=${
      state.period
    }${inputValue ? `&q=${inputValue}` : ""}${
      instanceStatusType
        ? `&status=${instanceStatusType
            .split(",")
            .map((status: string) => status.toLowerCase())
            .join(",")}`
        : ""
    }`;

    fetchData<"group">(url, addedNewItems, setGroupData, setGroupDataCount);
  };

  const getDataByInstance = async (addedNewItems = false) => {
    if (addedNewItems) offsetRef.current += 20;

    const url = `/ui/api/${key}?table=true&offset=${offsetRef.current}&index=${index}&period=${
      state.period
    }${inputValue ? `&q=${inputValue}` : ""}${
      modelKey ? `&key=${modelKey}` : ""
    }&status=${instanceStatusType.toLowerCase()}`;

    fetchData<"instance">(
      url,
      addedNewItems,
      setInstanceData,
      setInstanceDataCount,
    );
  };

  const fetchData = async <T extends "group" | "instance">(
    url: string,
    addedNewItems: boolean,
    setData: React.Dispatch<
      T extends "group"
        ? React.SetStateAction<TGroup[]>
        : React.SetStateAction<TInstance[]>
    >,
    setCount: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    try {
      setLoading(true);
      const response = await fetch(url);
      const { results, count } = await response.json();

      setNoMoreItems(results.length < 20);

      setData(
        addedNewItems
          ? [
              ...(index === "instance"
                ? (instanceData as TInstance[])
                : (groupData as TGroup[])),
              ...results,
            ]
          : results,
      );

      setCount(count);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadData =
    index === "instance"
      ? () => getDataByInstance(true)
      : () => getDataByGroup(true);

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
