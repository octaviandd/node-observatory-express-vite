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
    drawer,
    modelKey,
    message,
    setDrawer,
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
    <TablePageLayout
      drawer={drawer}
      setDrawer={setDrawer}
      type="exceptions"
    >
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
      {/* <Table
        data={index === "instance" ? instanceData : groupData}
        setDrawer={setDrawer}
      >
        <LoadMoreButton message={message} onLoadMore={loadMore} />
      </Table> */}
    </TablePageLayout>
  );
}
