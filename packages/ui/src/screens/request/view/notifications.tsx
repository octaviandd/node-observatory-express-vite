/** @format */

import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/base/card";
import { Separator } from "@/components/ui/base/separator";
import { LogInstanceResponse, MailInstanceResponse, NotificationInstanceResponse } from "@/hooks/useApiTyped";

type Props = {
  mails: MailInstanceResponse[];
  notifications: NotificationInstanceResponse[];
  logs: LogInstanceResponse[];
};

export const RequestPreviewNotifications = React.memo(
  ({ mails, notifications, logs }: Props) => {
    return (
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-5">
          <h3 className="text-xl font-medium">Notifications</h3>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">
              Emails
            </span>
            <span>{mails.length}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">
              Notifications
            </span>
            <span>{notifications.length}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">
              Logs
            </span>
            <span>{logs.length}</span>
          </div>
        </CardContent>
      </Card>
    );
  },
);
