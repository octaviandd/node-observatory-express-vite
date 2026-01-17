/** @format */

import { Globe } from "lucide-react";
import { GroupTable } from "./group";
import { InstanceTable } from "./instance";
import { useIndexTableData } from "@/hooks/useIndexTableData";
import {
  TablePageLayout,
  TableHeader,
  StatusFilter,
  SearchInput,
  LoadMoreButton,
} from "@/components/ui/table-page";

const STATUS_OPTIONS = ["all", "2xx", "4xx", "5xx"];

export default function HttpIndexTable() {
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
    key: "https",
    defaultInstanceStatusType: "all",
  });

  const Table = index === "instance" ? InstanceTable : GroupTable;
  const count = index === "instance" ? instanceDataCount : groupDataCount;
  const label = index === "instance" ? "Request" : "Route";

  return (
    <TablePageLayout
      sidePanelData={sidePanelData}
          setSidePanelData={setSidePanelData}
          type="http"
    >
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <TableHeader icon={Globe} count={count} label={label} />
        </div>
        <div className="flex px-4 grow">
          <SearchInput
            value={inputValue}
            onChange={setInputValue}
            placeholder={`Search ${index === "instance" ? "requests" : "routes"}`}
          />
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
