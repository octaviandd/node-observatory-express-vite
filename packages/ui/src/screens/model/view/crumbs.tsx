/** @format */

import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@/components/ui/base/breadcrumb";
import { Badge } from "@/components/ui/base/badge";
import { Card, CardContent } from "@/components/ui/base/card";
import { ChevronRight } from "lucide-react";
import { ModelInstanceResponse } from "@/hooks/useApiTyped";

export const ModelCrumbs = React.memo(
  ({ model }: { model: ModelInstanceResponse }) => {
    const getStatusColor = (status: string) => {
      if (status === "completed") return "secondary";
      if (status === "failed") return "destructive";
      return "secondary";
    };

    return (
      <Card className="rounded-sm">
        <CardContent className="flex flex-col gap-y-4 p-6">
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbLink href="/models" className="text-muted-foreground">
                Models
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem className="text-muted-foreground px-2">
              <ChevronRight className="h-3 w-3" />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink className="text-muted-foreground">
                {model.content.data.modelName}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
          <div className="flex items-center gap-x-4">
            <Badge variant="secondary">
              {model.content.metadata.package.toUpperCase()}
            </Badge>
            <Badge
              variant={getStatusColor(
                model.content.error?.code ? "failed" : "completed",
              )}
            >
              {model.content.error?.code ? "Failed" : "Completed"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  },
);
