/** @format */

import { Database } from "lucide-react";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { Input } from "@/components/ui/base/input";
import { useTableDataContext } from "@/hooks/useTableData";
import { QueryGroupResponse, QueryInstanceResponse } from "@/hooks/useApiTyped";
import { TableLayout } from "@/components/ui/layout/table-layout";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { StatusFilter } from "@/components/ui/status-filter";
import { TableHeader } from "@/components/ui/table-header";
import { SearchInput } from "@/components/ui/search-input";

const STATUS_OPTIONS = ["all", "select", "insert", "update", "delete"];

export default function QueryIndexTable() {
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
  const label = index === "instance" ? "Query" : "Endpoint";
  // Keep "Queries" plural label when in instance mode
  const pluralize = index !== "instance";

  return (
    <TableLayout type="queries">
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader
            icon={Database}
            count={count}
            label={index === "instance" ? "Queries" : label}
            pluralize={pluralize}
          />
          <div className="flex px-4 grow">
            {!modelKey && (
              <SearchInput
                value={inputValue}
                onChange={setInputValue}
                placeholder={`Search ${index === "instance" ? "queries" : "endpoints"}`}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {modelKey && (
            <StatusFilter
              options={STATUS_OPTIONS}
              value={instanceStatusType}
              onChange={setInstanceStatusType}
            />
          )}
        </div>
      </div>
      {index === "instance" ? (
        <InstanceTable data={instanceData as QueryInstanceResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as QueryGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TableLayout>
  );
}
