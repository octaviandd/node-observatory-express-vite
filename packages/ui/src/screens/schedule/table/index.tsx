/** @format */

import { CalendarCheck } from "lucide-react";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { useIndexTableData } from "@/hooks/useIndexTableData";
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
    drawer,
    setDrawer,
    setInstanceStatusType,
    loadMore,
  } = useIndexTableData<ScheduleInstanceResponse, ScheduleGroupResponse>({
    key: "schedules",
    defaultInstanceStatusType: "all",
  });

  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Attempt" : "Schedule";

  return (
    <TablePageLayout
      setDrawer={setDrawer}
      drawer={drawer}
      type="schedules"
    >
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
        <InstanceTable data={instanceData as ScheduleInstanceResponse[]} drawer={setDrawer}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as ScheduleGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TablePageLayout>
  );
}
