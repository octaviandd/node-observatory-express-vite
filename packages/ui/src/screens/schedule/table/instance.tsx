/** @format */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/base/table";
import { Badge } from "@/components/ui/base/badge";
import { memo, ReactNode } from "react";
import { formatDate, formatDuration } from "@/utils.js";
import { ScheduleInstanceResponse } from "@/hooks/useApiTyped";

type Props = {
  data: ScheduleInstanceResponse[];
  children: ReactNode;
};

export const InstanceTable = memo(({ data, children }: Props) => {
  const getStatusVariant = (status: string) => {
    if (status === "completed") return "secondary";
    if (status === "failed") return "destructive";
    return "error";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Date</TableHead>
            <TableHead>Job ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((schedule: ScheduleInstanceResponse) => (
            <TableRow
              key={schedule.uuid}
              className={schedule.content.error?.code ? "bg-red-800/20" : ""}
            >
              <TableCell className="font-medium text-muted-foreground">
                {formatDate(schedule.created_at)}
              </TableCell>
              <TableCell className="text-black dark:text-white">
                {schedule.content.data.jobId}
              </TableCell>
              <TableCell>
                <Badge
                  variant={getStatusVariant(
                    schedule.content.error?.code ? "failed" : "completed",
                  )}
                >
                  {schedule.content.error?.code ? "FAILED" : "COMPLETED"}
                </Badge>
              </TableCell>
              <TableCell>
                <p
                  className={
                    schedule.content.metadata.duration &&
                    schedule.content.metadata.duration > 999
                      ? "text-yellow-600"
                      : "text-black dark:text-white"
                  }
                >
                  {schedule.content.metadata.duration
                    ? formatDuration(schedule.content.metadata.duration)
                    : "N/A"}
                </p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {children}
    </div>
  );
});
