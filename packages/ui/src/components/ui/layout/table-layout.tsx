/** @format */

import { ReactNode } from "react";
import Drawer from "@/components/ui/drawer";
import type { ResourceKey } from "@/hooks/useApiTyped";

interface TablePageLayoutProps {
  children: ReactNode;
  type: ResourceKey;
}

export function TableLayout({
  children,
  type,
}: TablePageLayoutProps) {
  return (
    <div className="relative">
      <Drawer type={type}/>
      {children}
    </div>
  );
}

