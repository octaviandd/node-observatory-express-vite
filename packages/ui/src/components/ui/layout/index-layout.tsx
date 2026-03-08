/** @format */

import { ReactNode } from "react";

interface IndexPageLayoutProps {
  children: ReactNode;
}

export function IndexLayout({ children }: IndexPageLayoutProps) {
  return <div className="flex flex-col gap-6">{children}</div>;
}

