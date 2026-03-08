/** @format */

import { Globe } from "lucide-react";
import { GroupTable } from "./group";
import { InstanceTable } from "./instance";
import { useTableData } from "@/hooks/useTableData";
import { HttpClientGroupResponse, HttpClientInstanceResponse } from "@/hooks/useApiTyped";
import { TableLayout } from "@/components/ui/layout/table-layout";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { SearchInput } from "@/components/ui/search-input";
import { StatusFilter } from "@/components/ui/status-filter";
import { TableHeader } from "@/components/ui/table-header";

const STATUS_OPTIONS = ["all", "2xx", "4xx", "5xx"] as const;

export default function HttpIndexTable() {
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
  } = useTableData<HttpClientInstanceResponse, HttpClientGroupResponse>({
    key: "https",
    defaultInstanceStatusType: "all",
  });

  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Request" : "Route";

  return (
    <TableLayout type="https">
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={Globe} count={count} label={label} />
        </div>
        <div className="flex px-4 grow">
          <SearchInput
            value={inputValue}
            onChange={setInputValue}
            placeholder={`Search ${index === "instance" ? "requests" : "routes"}`}
          />
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
        <InstanceTable data={instanceData as HttpClientInstanceResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as HttpClientGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TableLayout>
  );
}