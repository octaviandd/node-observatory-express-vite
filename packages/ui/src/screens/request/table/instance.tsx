/** @format */

import { Link } from "react-router";
import { ArrowUpDown, ExternalLink, Link as LinkIcon } from "lucide-react";
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
import { memo, ReactNode, useContext } from "react";
import { formatDate, formatDuration } from "@/utils.js";
import { RequestInstanceResponse } from "@/hooks/useApiTyped";
import { StoreContext } from "@/store";

type Props = {
  data: RequestInstanceResponse[];
  children: ReactNode;
};

export const InstanceTable = memo(({ data, children }: Props) => {
  const { dispatch } = useContext(StoreContext);
  const getStatusVariant = (status: number) => {
    if (String(status).startsWith("2") || String(status).startsWith("3"))
      return "secondary";
    if (String(status).startsWith("4")) return "warning";
    return "error";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[12.5%]">Date</TableHead>
            <TableHead className="w-auto">Details</TableHead>
            <TableHead className="w-25">Status</TableHead>
            <TableHead className="w-25">Duration</TableHead>
            <TableHead className="w-25"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((request: RequestInstanceResponse) => (
            <TableRow
              key={request.uuid}
              className={
                request.content.data.statusCode.toString().startsWith("5")
                  ? "bg-red-800/20"
                  : ""
              }
            >
              <TableCell className="font-medium text-muted-foreground">
                {formatDate(request.created_at)}
              </TableCell>
              <TableCell className="flex font-medium items-center gap-2 text-muted-foreground h-13.25 dark:text-white">
                <span>{request.content.data.method?.toUpperCase()}</span>
                <ArrowUpDown className="h-4 w-4" />
                <span className="truncate max-w-100 text-black dark:text-white">
                  {request.content.data.originalUrl}
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={getStatusVariant(request.content.data.statusCode)}
                >
                  {request.content.data.statusCode}
                </Badge>
              </TableCell>
              <TableCell>
                <p
                  className={
                    request.content.metadata.duration > 999
                      ? "text-yellow-600"
                      : "text-black dark:text-white"
                  }
                >
                  {formatDuration(request.content.metadata.duration)}
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
                          modelId: request.uuid ?? "",
                          requestId: request.request_id ?? "",
                          jobId: request.job_id ?? "",
                          scheduleId: request.schedule_id ?? "",
                        },
                      })
                    }
                  >
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Link to={`/request/${request.uuid}`}>
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
