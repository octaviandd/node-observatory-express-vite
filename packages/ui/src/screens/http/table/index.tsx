/** @format */

import { Globe } from "lucide-react";
import { createPortal } from "react-dom";
import SidePanel from "../../../components/ui/side-panel";
import { GroupTable } from "./group";
import { InstanceTable } from "./instance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIndexTableData } from "@/hooks/useIndexTableData";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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

  return (
    <div className="relative">
      {sidePanelData.isOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-xs z-50"
            onClick={() =>
              setSidePanelData({
                ...sidePanelData,
                isOpen: false,
                requestId: "",
                jobId: "",
                scheduleId: "",
                modelId: "",
              })
            }
          ></div>,
          document.body,
        )}
      {sidePanelData.isOpen && (
        <SidePanel
          setSidePanelData={setSidePanelData}
          requestId={sidePanelData.requestId}
          jobId={sidePanelData.jobId}
          scheduleId={sidePanelData.scheduleId}
          modelId={sidePanelData.modelId}
          type="http"
        />
      )}
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-black dark:text-white">
            {index === "instance" ? instanceDataCount : groupDataCount}{" "}
            {index === "instance" ? "Request" : "Route"}
            {index === "instance" && Number(instanceDataCount) > 1 && "s"}
            {index === "group" && Number(groupDataCount) > 1 && "s"}
          </span>
        </div>
        <div className="flex px-4 grow">
          <Input
            type="text"
            placeholder={`Search ${index === "instance" ? "requests" : "routes"}`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-[300px] text-muted-foreground"
          />
        </div>
        {modelKey ? (
          <ToggleGroup
            type="single"
            value={instanceStatusType}
            onValueChange={(value) => value && setInstanceStatusType(value)}
          >
            <span className="text-sm text-muted-foreground border rounded-md px-2 py-1">
              SHOW
            </span>
            {["all", "2xx", "4xx", "5xx"].map((status) => (
              <ToggleGroupItem
                key={status}
                value={status}
                aria-label={status}
                className="text-black cursor-pointer dark:text-white"
              >
                {status.toUpperCase()}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        ) : null}
      </div>
      {/* @ts-expect-error dumb ts*/}
      <Table data={index === "instance" ? instanceData : groupData}
        setSidePanelData={setSidePanelData}
      >
        <div className="my-6">
          <div className="flex items-center justify-center">
            {message ? (
              <div className="text-sm text-muted-foreground bg-muted px-4 py-2 rounded-md">
                {message}
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={loadData}
                className="text-black"
              >
                Load older entries
              </Button>
            )}
          </div>
        </div>
      </Table>
    </div>
  );
}
