/** @format */

import { ExternalLink, FileCode, Link2 } from "lucide-react";
import { memo, ReactNode } from "react";
import { Link } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDuration, getSize } from "@/utils.js";
import { ViewInstanceResponse } from "@/hooks/useApiTyped";

type Props = {
  data: ViewInstanceResponse[];
  children: ReactNode;
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
};

export const InstanceTable = memo(
  ({ data, children, drawer }: Props) => {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Date</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((view: ViewInstanceResponse) => (
              <TableRow
                key={view.uuid}
                className={
                  view.content.status === "failed" ? "bg-red-800/20" : ""
                }
              >
                <TableCell className="font-medium text-muted-foreground">
                  {formatDate(view.created_at)}
                </TableCell>
                <TableCell className="flex items-center gap-2 h-[53px]">
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-[400px] text-black dark:text-white">
                    {view.content.data.view}
                  </span>
                </TableCell>
                <TableCell className="text-black dark:text-white">
                  {getSize(view.content.data.size)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      view.content.status === "completed"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {(view.content.status ?? "").toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span
                    className={
                      Number(view.content.duration ?? 0) > 999
                        ? "text-yellow-600"
                        : "text-black dark:text-white"
                    }
                  >
                    {formatDuration(Number(view.content.duration ?? 0))}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        drawer({
                          isOpen: true,
                          modelId: view.uuid ?? "",
                          requestId: view.request_id ?? "",
                          jobId: view.job_id ?? "",
                          scheduleId: view.schedule_id ?? "",
                        })
                      }
                    >
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Link to={`/view/${view.uuid}`}>
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
