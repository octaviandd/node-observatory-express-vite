/** @format */

import { DatabaseZap } from "lucide-react";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { useIndexTableData } from "@/hooks/useIndexTableData";
import { Input } from "@/components/ui/input";
import {
  TablePageLayout,
  TableHeader,
  StatusFilter,
  LoadMoreButton,
} from "@/components/ui/table-page";
import { CacheInstanceResponse, CacheGroupResponse } from "@/hooks/useApiTyped";

const STATUS_OPTIONS = ["all", "hits", "misses", "writes"] as const;

export default function CacheIndexTable() {
  const {
    instanceData,
    groupData,
    instanceDataCount,
    groupDataCount,
    index,
    instanceStatusType,
    inputValue,
    drawer,
    message,
    modelKey,
    setInputValue,
    setDrawer,
    setInstanceStatusType,
    loadMore,
  } = useIndexTableData<CacheInstanceResponse, CacheGroupResponse>({
    key: "cache",
    defaultInstanceStatusType: "all",
  });

  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Transaction" : "Key";

  return (
    <TablePageLayout
      drawer={drawer}
      setDrawer={setDrawer}
      type="cache"
    >
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={DatabaseZap} count={count} label={label} />
          <div className="flex px-4 grow">
            {!modelKey && (
              <Input
                type="text"
                placeholder={`Search ${index === "instance" ? "transactions" : "keys"}`}
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
        <InstanceTable data={instanceData as CacheInstanceResponse[]} setDrawer={setDrawer}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as CacheGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TablePageLayout>
  );
}