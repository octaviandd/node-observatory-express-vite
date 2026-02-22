/** @format */

import { FileCode } from "lucide-react";
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
import { ViewInstanceResponse, ViewGroupResponse } from "@/hooks/useApiTyped";

const STATUS_OPTIONS = ["all", "completed", "failed"];

export default function ViewsIndexTable() {
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
  } = useIndexTableData<ViewInstanceResponse, ViewGroupResponse>({
    key: "views",
    defaultInstanceStatusType: "all",
  });

  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "View" : "Path";

  return (
    <TablePageLayout type="views">
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={FileCode} count={count} label={label} />
          {!modelKey && (
            <div className="flex px-4 grow">
              <Input
                type="text"
                placeholder={`Search ${index === "instance" ? "views" : "paths"}`}
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
        <InstanceTable data={instanceData as ViewInstanceResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as ViewGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TablePageLayout>
  );
}
