/** @format */

import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { LogInstanceResponse } from "@/hooks/useApiTyped";

const LOG_LEVELS = [
  { dataKey: "info", variant: "secondary" },
  { dataKey: "warn", variant: "warning" },
  { dataKey: "error", variant: "error" },
  { dataKey: "debug", variant: "debug" },
  { dataKey: "trace", variant: "trace" },
  { dataKey: "fatal", variant: "error" },
  { dataKey: "log", variant: "log" },
] as const;

export const LogCrumbs = React.memo(({ log }: { log: LogInstanceResponse }) => {
  return (
    <Card className="rounded-sm">
      <CardContent className="flex flex-col gap-y-4 p-6">
        <Breadcrumb className="flex items-center gap-x-4">
          <BreadcrumbItem>
            <BreadcrumbLink href="/logs" className="text-muted-foreground">
              Logs
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem className="text-muted-foreground px-2">
            <ChevronRight className="h-3 w-3" />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink className="text-muted-foreground">
              {typeof log.content.data.message === 'object' ? JSON.stringify(log.content.data.message) : String(log.content.data.message ?? "")}
            </BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <div className="flex items-center gap-x-4">
          <Badge variant="secondary">{log.content.metadata.package.toUpperCase()}</Badge>
          <Badge
            variant={
              LOG_LEVELS.find((level) => level.dataKey === log.content.metadata.level)
                ?.variant
            }
          >
            {log.content.metadata.level.toUpperCase()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
});
