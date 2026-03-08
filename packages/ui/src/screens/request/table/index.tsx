/** @format */

import { ArrowUpDown } from "lucide-react";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { Input } from "@/components/ui/base/input";
import { Button } from "@/components/ui/base/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/base/toggle-group";
import { useTableDataContext } from "@/hooks/useTableData";
import { TableLayout } from "@/components/ui/layout/table-layout";
import { RequestGroupResponse, RequestInstanceResponse } from "@/hooks/useApiTyped";
import { SearchInput } from "@/components/ui/search-input";

export default function RequestIndexTable() {
  const {
    instanceData,
    groupData,
    instanceDataCount,
    groupDataCount,
    index,
    instanceStatusType,
    inputValue,
    modelKey,
    message,
    setInstanceStatusType,
    setInputValue,
    loadMore,
  } = useTableDataContext();

  const loadMoreButton = (
    <div className="flex justify-center my-2">
      {message ? (
        <Button variant="outline" className="text-muted-foreground" disabled>
          {message}
        </Button>
      ) : (
        <Button
          variant="outline"
          className="text-muted-foreground"
          onClick={(e) => {
            e.preventDefault();
            loadMore();
          }}
        >
          Load older entries
        </Button>
      )}
    </div>
  );

  return (
    <TableLayout type="requests">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-black dark:text-white">
            {index === "instance" ? instanceDataCount : groupDataCount}{" "}
            {index === "instance" ? "Request" : "Route"}
            {(index === "instance"
              ? parseFloat(instanceDataCount)
              : parseFloat(groupDataCount)) > 1
              ? "s"
              : ""}
          </span>
          {!modelKey && (
            <div className="flex px-4 grow">
              <SearchInput
                value={inputValue}
                onChange={setInputValue}
                placeholder={`Search ${index === "instance" ? "requests" : "routes"}`}
              />
            </div>
          )}
        </div>
        <Toggles
          modelKey={modelKey}
          instanceStatusType={instanceStatusType}
          setInstanceStatusType={setInstanceStatusType}
        />
      </div>
      {index === "instance" ? (
        <InstanceTable data={instanceData as RequestInstanceResponse[]}>
          {loadMoreButton}
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as RequestGroupResponse[]}>
          {loadMoreButton}
        </GroupTable>
      )}
    </TableLayout>
  );
}

const Toggles = ({ modelKey, instanceStatusType, setInstanceStatusType }: { modelKey: string; instanceStatusType: string; setInstanceStatusType: (value: string) => void }) => {
  return (
    <div className="flex items-center gap-4">
      {modelKey ? (
        <ToggleGroup
          type="single"
          value={instanceStatusType}
          onValueChange={(value) => value && setInstanceStatusType(value)}
        >
          <span className="text-sm text-muted-foreground border rounded-md px-2 py-1">
            SHOW
          </span>
          {["all", "2xx", "4xx", "5xx"].map((status) => (
            <ToggleGroupItem
              key={status}
              value={status}
              aria-label={status}
              className="text-black cursor-pointer dark:text-white"
            >
              {status.toUpperCase()}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : null}
    </div>
  );
};