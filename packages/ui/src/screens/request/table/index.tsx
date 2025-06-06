/** @format */

import { ArrowUpDown } from "lucide-react";
import SidePanel from "../../../components/ui/side-panel";
import { createPortal } from "react-dom";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIndexTableData } from "@/hooks/useIndexTableData";
import { Dispatch, memo, SetStateAction } from "react";
import { SidePanelState } from "../../../../types";

export default function RequestIndexTable() {
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
    key: "requests",
    defaultInstanceStatusType: "all",
  });

  const Table = index === "instance" ? InstanceTable : GroupTable;

  return (
    <div className="relative">
      <SidePanelOpener
        sidePanelData={sidePanelData}
        setSidePanelData={setSidePanelData}
      />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-black dark:text-white">
            {index === "instance" ? instanceDataCount : groupDataCount}{" "}
            {index === "instance" ? "Request" : "Route"}
            {(index === "instance"
              ? parseFloat(instanceDataCount)
              : parseFloat(groupDataCount)) > 1
              ? "s"
              : ""}
          </span>
          {!modelKey && (
            <div className="flex px-4 grow">
              <Input
                placeholder={`Search ${index === "instance" ? "requests" : "routes"}`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-[300px] text-muted-foreground"
              />
            </div>
          )}
        </div>
        <Toggles
          modelKey={modelKey}
          instanceStatusType={instanceStatusType}
          setInstanceStatusType={setInstanceStatusType}
        />
      </div>
      {/* @ts-expect-error dumb ts*/}
      <Table data={index === "instance" ? instanceData : groupData}
        setSidePanelData={setSidePanelData}
      >
        <div className="flex justify-center my-2">
          {message ? (
            <Button
              variant="outline"
              className="text-muted-foreground"
              disabled
            >
              {message}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="text-muted-foreground"
              onClick={loadData}
            >
              Load older entries
            </Button>
          )}
        </div>
      </Table>
    </div>
  );
}

const Toggles = memo(
  ({
    modelKey,
    instanceStatusType,
    setInstanceStatusType,
  }: {
    modelKey: string;
    instanceStatusType: string;
    setInstanceStatusType: (value: string) => void;
  }) => {
    return (
      <div className="flex items-center gap-4">
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
    );
  },
);

const SidePanelOpener = memo(
  ({
    sidePanelData,
    setSidePanelData,
  }: {
    sidePanelData: SidePanelState;
    setSidePanelData: Dispatch<
      SetStateAction<{
        isOpen: boolean;
        modelId?: string | undefined;
        requestId?: string | undefined;
        jobId?: string | undefined;
        scheduleId?: string | undefined;
      }>
    >;
  }) => {
    return (
      <>
        {sidePanelData.isOpen &&
          createPortal(
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50"
              onClick={() =>
                setSidePanelData({
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
            type="requests"
          />
        )}
      </>
    );
  },
);
