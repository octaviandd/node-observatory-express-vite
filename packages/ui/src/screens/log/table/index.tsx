/** @format */

import { Logs } from "lucide-react";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { useTableDataContext } from "@/hooks/useTableData";
import { Input } from "@/components/ui/base/input";
import { LogInstanceResponse, LogGroupResponse } from "@/hooks/useApiTyped";
import { TableLayout } from "@/components/ui/layout/table-layout";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { TableHeader } from "@/components/ui/table-header";
import { SearchInput } from "@/components/ui/search-input";

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
  } = useTableDataContext();

  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Log" : "Source";

  return (
    <TableLayout type="logs">
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={Logs} count={count} label={label} />
          <div className="flex px-4 grow">
            {!modelKey && (
              <SearchInput
                value={inputValue}
                onChange={setInputValue}
                placeholder={`Search ${index === "instance" ? "logs" : "log sources"}`}
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
    </TableLayout>
  );
}
