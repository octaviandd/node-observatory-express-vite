/** @format */

import { Database } from "lucide-react";
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
import { QueryGroupResponse, QueryInstanceResponse } from "@/hooks/useApiTyped";

const STATUS_OPTIONS = ["all", "select", "insert", "update", "delete"];

export default function QueryIndexTable() {
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
  } = useIndexTableData<QueryInstanceResponse, QueryGroupResponse>({
    key: "queries",
    defaultInstanceStatusType: "all",
  });

  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Query" : "Endpoint";
  // Keep "Queries" plural label when in instance mode
  const pluralize = index !== "instance";

  return (
    <TablePageLayout
      setDrawer={setDrawer}
      drawer={drawer}
      type="queries"
    >
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader
            icon={Database}
            count={count}
            label={index === "instance" ? "Queries" : label}
            pluralize={pluralize}
          />
          <div className="flex px-4 grow">
            {!modelKey && (
              <Input
                type="text"
                placeholder={`Search ${index === "instance" ? "queries" : "endpoints"}`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-[300px] text-muted-foreground"
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {modelKey && (
            <StatusFilter
              options={STATUS_OPTIONS}
              value={instanceStatusType}
              onChange={setInstanceStatusType}
            />
          )}
        </div>
      </div>
      {index === "instance" ? (
        <InstanceTable data={instanceData as QueryInstanceResponse[]} drawer={setDrawer}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as QueryGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TablePageLayout>
  );
}
