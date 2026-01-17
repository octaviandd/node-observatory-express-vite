/** @format */

import { Mail } from "lucide-react";
import { GroupTable } from "./group";
import { InstanceTable } from "./instance";
import { useIndexTableData } from "@/hooks/useIndexTableData";
import { Input } from "@/components/ui/input";
import {
  TablePageLayout,
  TableHeader,
  StatusFilter,
  LoadMoreButton,
} from "@/components/ui/table-page";

const STATUS_OPTIONS = ["all", "completed", "failed"];

export default function MailsIndexTable() {
  const {
    instanceData,
    groupData,
    instanceDataCount,
    groupDataCount,
    index,
    instanceStatusType,
    inputValue,
    sidePanelData,
    modelKey,
    message,
    setSidePanelData,
    setInstanceStatusType,
    setInputValue,
    loadData,
  } = useIndexTableData({
    key: "mails",
    defaultInstanceStatusType: "all",
  });

  const Table = index === "instance" ? InstanceTable : GroupTable;
  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Mail" : "Receiver";

  return (
    <TablePageLayout
      sidePanelData={sidePanelData}
          setSidePanelData={setSidePanelData}
          type="mails"
    >
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={Mail} count={count} label={label} />
          <div className="flex px-4 grow">
            {!modelKey && (
              <Input
                type="text"
                placeholder={`Search ${index === "instance" ? "mails" : "receivers"}`}
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
