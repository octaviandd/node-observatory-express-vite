/** @format */
// hooks/useFilterContext.tsx

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from "react";
import { useParams } from "react-router";
import { components } from "@/types/api";

type IndexType = components["schemas"]["IndexType"];

type FilterState = {
  index: IndexType;
  instanceStatusType: string;
  inputValue: string;
  modelKey: string;
};

type FilterActions = {
  setIndex: (val: IndexType) => void;
  setInstanceStatusType: (val: string) => void;
  setInputValue: (val: string) => void;
};

type FilterContextValue = FilterState & FilterActions;

const FilterContext = createContext<FilterContextValue | null>(null);

export const useFilters = (): FilterContextValue => {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
};

type FilterProviderProps = {
  children: ReactNode;
  defaultInstanceStatusType: string;
};

export const FilterProvider = ({ 
  children, 
  defaultInstanceStatusType 
}: FilterProviderProps) => {
  const modelKey = useParams<{ key: string }>().key || "";

  const [index, setIndex] = useState<IndexType>(
    modelKey ? "instance" : "group"
  );
  const [instanceStatusType, setInstanceStatusType] = useState(defaultInstanceStatusType);
  const [inputValue, setInputValue] = useState("");

  // Reset filters when modelKey changes
  useEffect(() => {
    setIndex(modelKey ? "instance" : "group");
    setInstanceStatusType(defaultInstanceStatusType);
    setInputValue("");
  }, [modelKey, defaultInstanceStatusType]);

  // Memoize the entire context value
  const value = useMemo(
    () => ({
      index,
      instanceStatusType,
      inputValue,
      modelKey,
      setIndex,
      setInstanceStatusType,
      setInputValue,
    }),
    [index, instanceStatusType, inputValue, modelKey]
  );

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};