/** @format */

import { DatabaseZap } from "lucide-react";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { useTableData } from "@/hooks/useTableData";
import { CacheInstanceResponse, CacheGroupResponse } from "@/hooks/useApiTyped";
import { SearchInput } from "@/components/ui/search-input";
import { TableLayout } from "@/components/ui/layout/table-layout";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { StatusFilter } from "@/components/ui/status-filter";
import { TableHeader } from "@/components/ui/table-header";

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
    message,
    modelKey,
    setInputValue,
    setInstanceStatusType,
    loadMore,
  } = useTableData({ key: "cache" });

  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Transaction" : "Key";

  return (
    <TableLayout type="cache">
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={DatabaseZap} count={count} label={label} />
          <div className="flex px-4 grow">
            {!modelKey && (
              <SearchInput
                value={inputValue}
                onChange={setInputValue}
                placeholder={`Search ${index === "instance" ? "transactions" : "keys"}`}
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
        <InstanceTable data={instanceData as CacheInstanceResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as CacheGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TableLayout>
  );
}