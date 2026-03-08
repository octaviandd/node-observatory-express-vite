/** @format */

import { ReactNode } from "react";

interface StatsGridProps {
  children: ReactNode;
  /** Number of columns. Defaults to 2 */
  columns?: 1 | 2;
}

export function StatsGrid({ children, columns = 2 }: StatsGridProps) {
  return (
    <div className={`grid gap-4 ${columns === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {children}
    </div>
  );
}

