/** @format */

import { ReactNode } from "react";
import { createPortal } from "react-dom";
import Drawer from "@/components/ui/side-panel";
import { DrawerState } from "@/hooks/useIndexTableData";
import type { ResourceKey } from "@/hooks/useApiTyped";

interface TablePageLayoutProps {
  children: ReactNode;
  drawer: DrawerState;
  setDrawer: (data: DrawerState) => void;
  type: ResourceKey;
}

export function TablePageLayout({
  children,
  drawer,
  setDrawer,
  type,
}: TablePageLayoutProps) {
  return (
    <div className="relative">
      <Drawer
        drawer={drawer}
        setDrawer={setDrawer}
        type={type}
      />
      {children}
    </div>
  );
}

