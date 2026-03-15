/** @format */

import { ExternalLink, Link2, Bell } from "lucide-react";
import { Link } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/base/table";
import { Button } from "@/components/ui/base/button";
import { Badge } from "@/components/ui/base/badge";
import { memo, useContext } from "react";
import { formatDate, formatDuration } from "@/utils.js";
import { NotificationInstanceResponse } from "@/hooks/useApiTyped";
import { StoreContext } from "@/store";

type Props = {
  data: NotificationInstanceResponse[];
  children: React.ReactNode;
};

export const InstanceTable = memo(({ data, children }: Props) => {
  const { dispatch } = useContext(StoreContext);
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-50">Date</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="w-25"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((notification: NotificationInstanceResponse) => (
            <TableRow
              key={notification.uuid}
              className={
                notification.content.error?.code ? "bg-red-800/20" : ""
              }
            >
              <TableCell className="font-medium text-muted-foreground">
                {formatDate(notification.created_at)}
              </TableCell>
              <TableCell className="flex items-center gap-2 h-13.25">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-100 text-black dark:text-white">
                  {notification.content.data.channel === ""
                    ? "No channel [error]"
                    : notification.content.data.channel}
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    !notification.content.error?.code ? "secondary" : "error"
                  }
                >
                  {notification.content.error?.code ? "Failed" : "Completed"}
                </Badge>
              </TableCell>
              <TableCell>
                <p
                  className={
                    notification.content.metadata.duration > 999
                      ? "text-yellow-600"
                      : "text-black dark:text-white"
                  }
                >
                  {formatDuration(notification.content.metadata.duration)}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      dispatch({
                        type: "openDrawer",
                        payload: {
                          modelId: notification.uuid ?? "",
                          requestId: notification.request_id ?? "",
                          jobId: notification.job_id ?? "",
                          scheduleId: notification.schedule_id ?? "",
                        },
                      })
                    }
                  >
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Link to={`/notification/${notification.uuid}`}>
                    <Button variant="outline" size="icon">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {children}
    </div>
  );
});
