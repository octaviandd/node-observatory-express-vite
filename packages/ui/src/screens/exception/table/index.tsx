/** @format */

import { Bug } from "lucide-react";
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
import { ExceptionGroupResponse, ExceptionInstanceResponse } from "@/hooks/useApiTyped";

const STATUS_OPTIONS = ["all", "unhandled", "uncaught"];

export default function ExceptionsIndexTable() {
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
  } = useIndexTableData({
    key: "exceptions",
    defaultInstanceStatusType: "all",
  });

  const Table = index === "instance" ? InstanceTable : GroupTable;
  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Exception" : "Type";

  return (
    <TablePageLayout type="exceptions">
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={Bug} count={count} label={label} />
        </div>
        <div className="flex px-4 grow">
          {!modelKey && (
            <Input
              type="text"
              placeholder="Search exceptions"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-[300px] text-muted-foreground"
            />
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
        <InstanceTable data={instanceData as ExceptionInstanceResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as ExceptionGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TablePageLayout>
  );
}
