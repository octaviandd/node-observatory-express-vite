/** @format */

import React from "react";
import { Card, CardContent } from "@/components/ui/base/card";
import { Badge } from "@/components/ui/base/badge";
import { Breadcrumb, BreadcrumbLink } from "@/components/ui/base/breadcrumb";
import { BreadcrumbItem } from "@/components/ui/base/breadcrumb";
import { ChevronRight } from "lucide-react";
import { JobInstanceResponse } from "@/hooks/useApiTyped";

export const JobPreviewCrumbs = React.memo(
  ({ job }: { job: JobInstanceResponse }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case "completed":
          return "secondary";
        case "released":
          return "warning";
        default:
          return "destructive";
      }
    };

    return (
      <Card className="border-none">
        <CardContent className="p-6">
          <div className="flex flex-col gap-y-4">
            <Breadcrumb className="flex items-center gap-x-4">
              <BreadcrumbItem>
                <BreadcrumbLink href="/jobs" className="text-muted-foreground">
                  Jobs
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem className="text-muted-foreground px-2">
                <ChevronRight className="h-3 w-3" />
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbLink className="text-muted-foreground">
                  {job.content.data.queue}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </Breadcrumb>
            <div className="flex items-center gap-x-4">
              <Badge variant="secondary" className="text-sm">
                {job.content.data.jobId} (ID)
              </Badge>
              <Badge variant={getStatusColor(job.content.status ?? "")}>
                {job.content.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },
);
