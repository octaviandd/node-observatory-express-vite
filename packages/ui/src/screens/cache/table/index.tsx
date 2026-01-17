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

const STATUS_OPTIONS = ["all", "hits", "misses", "writes"];

export default function CacheIndexTable() {
  const {
    instanceData,
    groupData,
    instanceDataCount,
    groupDataCount,
    index,
    instanceStatusType,
    inputValue,
    sidePanelData,
    message,
    modelKey,
    setInputValue,
    setSidePanelData,
    setInstanceStatusType,
    loadData,
  } = useIndexTableData({
    key: "cache",
    defaultInstanceStatusType: "all",
  });

  const Table = index === "instance" ? InstanceTable : GroupTable;
  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Transaction" : "Key";

  return (
    <TablePageLayout
      sidePanelData={sidePanelData}
      setSidePanelData={setSidePanelData}
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
      {/* @ts-expect-error dumb ts*/}
      <Table
        data={index === "instance" ? instanceData : groupData}
        setSidePanelData={setSidePanelData}
      >
        <LoadMoreButton message={message} onLoadMore={loadData} />
      </Table>
    </TablePageLayout>
  );
}
