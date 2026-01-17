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

export default function LogsIndexTable() {
  const {
    instanceData,
    groupData,
    instanceDataCount,
    groupDataCount,
    index,
    inputValue,
    sidePanelData,
    modelKey,
    message,
    setSidePanelData,
    setInputValue,
    loadData,
  } = useIndexTableData({
    key: "logs",
    defaultInstanceStatusType: "all",
  });

  const Table = index === "instance" ? InstanceTable : GroupTable;
  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Log" : "Source";

  return (
    <TablePageLayout
      sidePanelData={sidePanelData}
      setSidePanelData={setSidePanelData}
      type="logs"
    >
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
