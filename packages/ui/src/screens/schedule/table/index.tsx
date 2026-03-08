/** @format */

import { CalendarCheck } from "lucide-react";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { useTableData } from "@/hooks/useTableData";
import {
  TablePageLayout,
  TableHeader,
  StatusFilter,
  LoadMoreButton,
} from "@/components/ui/table-page";
import { ScheduleInstanceResponse, ScheduleGroupResponse } from "@/hooks/useApiTyped";

const STATUS_OPTIONS = ["all", "completed", "failed"];

export default function ScheduledIndexTable() {
  const {
    instanceData,
    groupData,
    instanceDataCount,
    groupDataCount,
    index,
    instanceStatusType,
    modelKey,
    message,
    setInstanceStatusType,
    loadMore,
  } = useTableData<ScheduleInstanceResponse, ScheduleGroupResponse>({
    key: "schedules",
    defaultInstanceStatusType: "all",
  });

  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Attempt" : "Schedule";

  return (
    <TableLayout type="schedules">
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={CalendarCheck} count={count} label={label} />
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
        <InstanceTable data={instanceData as ScheduleInstanceResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as ScheduleGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TableLayout>
  );
}
