/** @format */

import { Mail } from "lucide-react";
import { GroupTable } from "./group";
import { InstanceTable } from "./instance";
import { useTableData } from "@/hooks/useTableData";
import { MailInstanceResponse, MailGroupResponse } from "@/hooks/useApiTyped";
import { TableLayout } from "@/components/ui/layout/table-layout";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { StatusFilter } from "@/components/ui/status-filter";
import { TableHeader } from "@/components/ui/table-header";
import { SearchInput } from "@/components/ui/search-input";

const STATUS_OPTIONS = ["all", "completed", "failed"];

export default function MailsIndexTable() {
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
  } = useTableData({ key: "mails" });

  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Mail" : "Receiver";

  return (
    <TableLayout type="mails">
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={Mail} count={count} label={label} />
          <div className="flex px-4 grow">
            {!modelKey && (
              <SearchInput
                value={inputValue}
                onChange={setInputValue}
                placeholder={`Search ${index === "instance" ? "mails" : "receivers"}`}
              />
            )}
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
        <InstanceTable data={instanceData as MailInstanceResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as MailGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TableLayout>
  );
}
