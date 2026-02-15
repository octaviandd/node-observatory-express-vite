/** @format */

import { MessageSquareDot } from "lucide-react";
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
import { NotificationInstanceResponse, NotificationGroupResponse } from "@/hooks/useApiTyped";

const STATUS_OPTIONS = ["all", "completed", "failed"];

export default function NotificationsIndexTable() {
  const {
    instanceData,
    groupData,
    instanceDataCount,
    groupDataCount,
    index,
    instanceStatusType,
    inputValue,
    setDrawer,
    modelKey,
    message,
    drawer,
    setInstanceStatusType,
    setInputValue,
    loadMore,
  } = useIndexTableData<NotificationInstanceResponse, NotificationGroupResponse>({
    key: "notifications",
    defaultInstanceStatusType: "all",
  });

  const count = index === "group" ? groupDataCount : instanceDataCount;
  const label = index === "group" ? "Channel" : "Notification";

  return (
    <TablePageLayout
      setDrawer={setDrawer}
      drawer={drawer}
      type="notifications"
    >
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={MessageSquareDot} count={count} label={label} />
          {!modelKey && (
            <div className="flex px-4 grow">
              <Input
                type="text"
                placeholder={`Search ${index === "group" ? "channels" : "notifications"}`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-[300px] text-muted-foreground"
              />
            </div>
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
        <InstanceTable data={instanceData as NotificationInstanceResponse[]} drawer={setDrawer}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as NotificationGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TablePageLayout>
  );
}
