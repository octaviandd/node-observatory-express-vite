/** @format */

import { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ViewPageLayoutProps {
  loading: boolean;
  error: string | null;
  children: ReactNode;
  /** Optional custom loading skeleton heights. Defaults to [200, 300] */
  skeletonHeights?: number[];
}

export function ViewPageLayout({
  loading,
  error,
  children,
  skeletonHeights = [200, 300],
}: ViewPageLayoutProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {skeletonHeights.map((height, index) => (
          <Skeleton key={index} className={`h-[${height}px] w-full`} style={{ height }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return <div className="flex flex-col gap-y-6">{children}</div>;
}

