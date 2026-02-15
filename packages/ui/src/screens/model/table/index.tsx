/** @format */

import { Cuboid } from "lucide-react";
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
import { ModelInstanceResponse, ModelGroupResponse } from "@/hooks/useApiTyped";

const STATUS_OPTIONS = ["all", "completed", "failed"];

export default function ModelsIndexTable() {
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
  } = useIndexTableData<ModelInstanceResponse, ModelGroupResponse>({
    key: "models",
    defaultInstanceStatusType: "all",
  });

  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Instance" : "Model";

  return (
    <TablePageLayout
      setDrawer={setDrawer}
      drawer={drawer}
      type="models"
    >
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={Cuboid} count={count} label={label} />
          <div className="flex px-4 grow">
            <Input
              type="text"
              placeholder={`Search ${index === "instance" ? "instances" : "models"}`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-[300px] text-muted-foreground"
            />
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
        <InstanceTable data={instanceData as ModelInstanceResponse[]} drawer={setDrawer}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </InstanceTable>
      ) : (
        <GroupTable data={groupData as ModelGroupResponse[]}>
          <LoadMoreButton message={message} onLoadMore={loadMore} />
        </GroupTable>
      )}
    </TablePageLayout>
  );
}
