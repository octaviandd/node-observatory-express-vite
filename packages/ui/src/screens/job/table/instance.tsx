/** @format */

import { Link } from "react-router";
import { ExternalLink, Link2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/base/table";
import { Badge } from "@/components/ui/base/badge";
import { Button } from "@/components/ui/base/button";
import { formatDate, formatDuration } from "@/utils.js";
import { ReactNode, memo, useContext } from "react";
import { JobInstanceResponse } from "@/hooks/useApiTyped";
import { StoreContext } from "@/store";

type Props = {
  data: JobInstanceResponse[];
  children: ReactNode;
};

export const InstanceTable = memo(
  ({ data, children }: Props) => {
    const { dispatch } = useContext(StoreContext);
    const getStatusVariant = (status: string) => {
      if (status === "completed") return "secondary";
      if (status === "released") return "warning";
      return "error";
    };

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Date</TableHead>
              <TableHead>Connection</TableHead>
              <TableHead>Attempt</TableHead>
              <TableHead>Job ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((job: JobInstanceResponse) => (
              <TableRow
                key={job.uuid}
                className={
                  job.content.status === "failed" ? "bg-red-800/20" : ""
                }
              >
                <TableCell className="font-medium text-muted-foreground">
                  {formatDate(job.created_at)}
                </TableCell>
                <TableCell className="text-black dark:text-white flex flex-col gap-1">
                  <span className="font-medium">
                    {job.content.data.connectionName}
                  </span>
                  <span className="text-muted-foreground">
                    ({job.content.data.queue})
                  </span>
                </TableCell>
                <TableCell className="text-black dark:text-white">
                  {job.content.status === "completed"
                    ? (job.content.data.attemptsMade ?? 0) + 1
                    : (job.content.data.attemptsMade ?? 0)}
                </TableCell>
                <TableCell className="text-black dark:text-white">
                  {job.content.data.jobId}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(job.content.status ?? "")}>
                    {(job.content.status ?? "").toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  {(job.content.status as string) !== "released" && (
                    <p
                      className={
                        Number(job.content.duration) > 999
                          ? "text-yellow-600"
                          : "text-black dark:text-white"
                      }
                    >
                      {formatDuration(Number(job.content.duration ?? 0))}
                    </p>
                  )}
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
                            modelId: job.uuid ?? "",
                            requestId: job.request_id ?? "",
                            jobId: job.job_id ?? "",
                            scheduleId: job.schedule_id ?? "",
                          },
                        })
                      }
                    >
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Link to={`/job/${job.uuid}`}>
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
  },
);
