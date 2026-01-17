/** @format */

import { ReactNode } from "react";
import { createPortal } from "react-dom";
import SidePanel from "@/components/ui/side-panel";
import { SidePanelState } from "../../../../types";

interface TablePageLayoutProps {
  children: ReactNode;
  sidePanelData: SidePanelState;
  setSidePanelData: (data: SidePanelState) => void;
  type: string;
}

export function TablePageLayout({
  children,
  sidePanelData,
  setSidePanelData,
  type,
}: TablePageLayoutProps) {
  const closeSidePanel = () =>
    setSidePanelData({
      isOpen: false,
      modelId: "",
      requestId: "",
      jobId: "",
      scheduleId: "",
    });

  return (
    <div className="relative">
      {sidePanelData.isOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-xs z-50"
            onClick={closeSidePanel}
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
          type={type}
        />
      )}
      {children}
    </div>
  );
}

