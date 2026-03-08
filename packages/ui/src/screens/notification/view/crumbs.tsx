/** @format */

import { memo } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@/components/ui/base/breadcrumb";
import { Badge } from "@/components/ui/base/badge";
import { Card, CardContent } from "@/components/ui/base/card";
import { ChevronRight } from "lucide-react";
import { NotificationInstanceResponse } from "@/hooks/useApiTyped";

export const NotificationCrumbs = memo(
  ({ notification }: { notification: NotificationInstanceResponse }) => {
    const getStatusColor = (status: string) => {
      if (status === "completed") return "secondary";
      if (status === "failed") return "destructive";
      return "warning";
    };

    return (
      <Card className="rounded-sm">
        <CardContent className="flex flex-col gap-y-4 p-6">
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/notifications"
                className="text-muted-foreground"
              >
                Notifications
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem className="text-muted-foreground px-4">
              <ChevronRight className="h-3 w-3" />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink className="text-muted-foreground">
                {notification.content.data.channel}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
          <div className="flex items-center gap-x-4">
            <Badge variant="secondary">
              {notification.content.metadata.package.toUpperCase()}
            </Badge>
            <Badge variant={getStatusColor(notification.content.status as string)}>
              {notification.content.status?.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  },
);
