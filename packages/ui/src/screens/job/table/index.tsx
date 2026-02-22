/** @format */

import { Layers } from "lucide-react";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { Input } from "@/components/ui/input";
import { useIndexTableData } from "@/hooks/useIndexTableData";
import {
  TablePageLayout,
  TableHeader,
  StatusFilter,
  LoadMoreButton,
} from "@/components/ui/table-page";
import { JobInstanceResponse, JobGroupResponse } from "@/hooks/useApiTyped";

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
  } = useIndexTableData({
    key: "jobs",
    defaultInstanceStatusType: "all",
  });

  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "group" ? "Queue" : "ATTEMPT";

  return (
    <TablePageLayout type="jobs">
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={Layers} count={count} label={label} />
          {index === "group" && (
            <div className="flex px-4 grow">
              <Input
                type="text"
                placeholder="Search queues"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-[300px] text-muted-foreground"
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
    </TablePageLayout>
  );
}
