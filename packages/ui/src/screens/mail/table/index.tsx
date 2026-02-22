/** @format */

import { Mail } from "lucide-react";
import { GroupTable } from "./group";
import { InstanceTable } from "./instance";
import { useIndexTableData } from "@/hooks/useIndexTableData";
import { Input } from "@/components/ui/input";
import {
  TablePageLayout,
  TableHeader,
  StatusFilter,
  LoadMoreButton,
} from "@/components/ui/table-page";
import { MailInstanceResponse, MailGroupResponse } from "@/hooks/useApiTyped";

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
  } = useIndexTableData<MailInstanceResponse, MailGroupResponse>({
    key: "mails",
    defaultInstanceStatusType: "all",
  });

  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Mail" : "Receiver";

  return (
    <TablePageLayout type="mails">
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={Mail} count={count} label={label} />
          <div className="flex px-4 grow">
            {!modelKey && (
              <Input
                type="text"
                placeholder={`Search ${index === "instance" ? "mails" : "receivers"}`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-[300px] text-muted-foreground"
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
    </TablePageLayout>
  );
}
