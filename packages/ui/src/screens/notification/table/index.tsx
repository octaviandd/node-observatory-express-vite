/** @format */

import { MessageSquareDot } from "lucide-react";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { useTableData } from "@/hooks/useTableData";
import { NotificationInstanceResponse, NotificationGroupResponse } from "@/hooks/useApiTyped";
import { TableLayout } from "@/components/ui/layout/table-layout";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { StatusFilter } from "@/components/ui/status-filter";
import { TableHeader } from "@/components/ui/table-header";
import { SearchInput } from "@/components/ui/search-input";

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
    modelKey,
    message,
    setInstanceStatusType,
    setInputValue,
    loadMore,
  } = useTableData({ key: "notifications", defaultInstanceStatusType: "all" });

  const count = index === "group" ? groupDataCount : instanceDataCount;
  const label = index === "group" ? "Channel" : "Notification";

  return (
    <TableLayout type="notifications">
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={MessageSquareDot} count={count} label={label} />
          {!modelKey && (
            <div className="flex px-4 grow">
              <SearchInput
                value={inputValue}
                onChange={setInputValue}
                placeholder={`Search ${index === "group" ? "channels" : "notifications"}`}
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
        <InstanceTable data={instanceData as NotificationInstanceResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as NotificationGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TableLayout>
  );
}
