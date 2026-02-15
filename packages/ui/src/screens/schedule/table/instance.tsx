/** @format */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { memo, ReactNode } from "react";
import { formatDate, formatDuration } from "@/utils.js";
import { ScheduleInstanceResponse } from "@/hooks/useApiTyped";

type Props = {
  data: ScheduleInstanceResponse[];
  drawer: ({
    isOpen,
    modelId,
    requestId,
    jobId,
    scheduleId,
  }: {
    isOpen: boolean;
    modelId: string;
    requestId: string;
    jobId: string;
    scheduleId: string;
  }) => void;
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
              className={!schedule.content.status ? "bg-red-800/20" : ""}
            >
              <TableCell className="font-medium text-muted-foreground">
                {formatDate(schedule.created_at)}
              </TableCell>
              <TableCell className="text-black dark:text-white">
                {schedule.content.metadata.jobId}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(schedule.content.status ?? "")}>
                  {(schedule.content.status ?? "").toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <p
                  className={
                    schedule.content.duration && schedule.content.duration > 999
                      ? "text-yellow-600"
                      : "text-black dark:text-white"
                  }
                >
                  {schedule.content.duration
                    ? formatDuration(schedule.content.duration)
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
