/** @format */

import { Bug } from "lucide-react";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { useTableData } from "@/hooks/useTableData";
import { ExceptionGroupResponse, ExceptionInstanceResponse } from "@/hooks/useApiTyped";
import { TableLayout } from "@/components/ui/layout/table-layout";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { StatusFilter } from "@/components/ui/status-filter";
import { TableHeader } from "@/components/ui/table-header";
import { SearchInput } from "@/components/ui/search-input";

const STATUS_OPTIONS = ["all", "unhandled", "uncaught"];

export default function ExceptionsIndexTable() {
  const {
    instanceData,
    groupData,
    instanceDataCount,
    index,
    instanceStatusType,
    inputValue,
    modelKey,
    message,
    setInstanceStatusType,
    setInputValue,
    loadMore,
  } = useTableData({ key: "exceptions" });

  const label = index === "instance" ? "Exception" : "Type";

  return (
    <TableLayout type="exceptions">
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={Bug} count={instanceDataCount} label={label} />
        </div>
        <div className="flex px-4 grow">
          {!modelKey && (
            <SearchInput
              value={inputValue}
              onChange={setInputValue}
              placeholder="Search exceptions"
            />
          )}
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
        <InstanceTable data={instanceData as ExceptionInstanceResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as ExceptionGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TableLayout>
  );
}
