/** @format */

import { Cuboid } from "lucide-react";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { Input } from "@/components/ui/base/input";
import { useTableDataContext } from "@/hooks/useTableData";
import { ModelInstanceResponse, ModelGroupResponse } from "@/hooks/useApiTyped";
import { TableLayout } from "@/components/ui/layout/table-layout";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { StatusFilter } from "@/components/ui/status-filter";
import { TableHeader } from "@/components/ui/table-header";
import { SearchInput } from "@/components/ui/search-input";

const STATUS_OPTIONS = ["all", "completed", "failed"];

export default function ModelsIndexTable() {
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

  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Instance" : "Model";

  return (
    <TableLayout type="models">
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={Cuboid} count={count} label={label} />
          <div className="flex px-4 grow">
            <SearchInput
              value={inputValue}
              onChange={setInputValue}
              placeholder={`Search ${index === "instance" ? "instances" : "models"}`}
            />
          </div>
        </div>
        {modelKey && (
          <StatusFilter
            options={STATUS_OPTIONS}
            value={instanceStatusType}
            onChange={setInstanceStatusType}
          />
        )}
      </div>
      {index === "instance" ? (
        <InstanceTable data={instanceData as ModelInstanceResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as ModelGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TableLayout>
  );
}
