/** @format */

import { Logs } from "lucide-react";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { useIndexTableData } from "@/hooks/useIndexTableData";
import { Input } from "@/components/ui/input";
import {
  TablePageLayout,
  TableHeader,
  LoadMoreButton,
} from "@/components/ui/table-page";
import { LogInstanceResponse, LogGroupResponse } from "@/hooks/useApiTyped";

export default function LogsIndexTable() {
  const {
    instanceData,
    groupData,
    instanceDataCount,
    groupDataCount,
    index,
    inputValue,
    modelKey,
    message,
    setInputValue,
    loadMore,
  } = useIndexTableData<LogInstanceResponse, LogGroupResponse>({
    key: "logs",
    defaultInstanceStatusType: "all",
  });

  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Log" : "Source";

  return (
    <TablePageLayout type="logs">
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={Logs} count={count} label={label} />
          <div className="flex px-4 grow">
            {!modelKey && (
              <Input
                type="text"
                placeholder={`Search ${index === "instance" ? "logs" : "log sources"}`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-[300px] text-muted-foreground"
              />
            )}
          </div>
        </div>
      </div>
      {index === "instance" ? (
        <InstanceTable data={instanceData as LogInstanceResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as LogGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TablePageLayout>
  );
}
