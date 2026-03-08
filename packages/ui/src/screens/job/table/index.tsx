/** @format */

import { Layers } from "lucide-react";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { Input } from "@/components/ui/base/input";
import { useTableData } from "@/hooks/useTableData";
import { JobInstanceResponse, JobGroupResponse } from "@/hooks/useApiTyped";
import { TableLayout } from "@/components/ui/layout/table-layout";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { StatusFilter } from "@/components/ui/status-filter";
import { TableHeader } from "@/components/ui/table-header";
import { SearchInput } from "@/components/ui/search-input";

const STATUS_OPTIONS = ["all", "completed", "released", "failed"];

export default function JobsIndexTable() {
  const {
    instanceData,
    groupData,
    instanceDataCount,
    groupDataCount,
    index,
    instanceStatusType,
    inputValue,
    message,
    setInstanceStatusType,
    setInputValue,
    loadMore,
  } = useTableData({
    key: "jobs",
    defaultInstanceStatusType: "all",
  });

  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "group" ? "Queue" : "ATTEMPT";

  return (
    <TableLayout type="jobs">
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={Layers} count={count} label={label} />
          {index === "group" && (
            <div className="flex px-4 grow">
              <SearchInput
                value={inputValue}
                onChange={setInputValue}
                placeholder={`Search queues`}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {index === "instance" && (
            <StatusFilter
              options={STATUS_OPTIONS}
              value={instanceStatusType}
              onChange={setInstanceStatusType}
            />
          )}
        </div>
      </div>
      {index === "instance" ? (
        <InstanceTable data={instanceData as JobInstanceResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as JobGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TableLayout>
  );
}
