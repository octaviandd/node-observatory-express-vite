/** @format */

import { ExternalLink, Globe, LinkIcon } from "lucide-react";
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
import { ReactNode, memo, useContext } from "react";
import { Badge } from "@/components/ui/base/badge";
import { formatDate, formatDuration } from "@/utils.js";
import { HttpClientInstanceResponse } from "@/hooks/useApiTyped";
import { StoreContext } from "@/store";

type Props = {
  data: HttpClientInstanceResponse[];
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
            <TableHead className="w-[200px]">Date</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((request: HttpClientInstanceResponse) => (
            <TableRow key={request.uuid}>
              <TableCell className="font-medium text-muted-foreground">
                {formatDate(request.created_at)}
              </TableCell>
              <TableCell className="flex items-center gap-2 h-[53px]">
                <span className="text-black dark:text-white">
                  {(request.content.data.method ?? "").toUpperCase()}
                </span>
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {request.content.data.origin
                    ? request.content.data.origin +
                      (request.content.data.pathname ??
                        request.content.data.path ??
                        "")
                    : (request.content.data.hostname ?? "") +
                      (request.content.data.pathname ?? "")}
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={getStatusVariant(
                    request.content.data.statusCode as number,
                  )}
                >
                  {request.content.data.statusCode !== 0
                    ? request.content.data.statusCode
                    : "Internal Error"}
                </Badge>
              </TableCell>
              <TableCell>
                <p
                  className={
                    request.content.metadata.duration &&
                    request.content.metadata.duration > 999
                      ? "text-yellow-600"
                      : "text-black dark:text-white"
                  }
                >
                  {formatDuration(request.content.metadata.duration as number)}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
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
                  <Link to={`/http/${request.uuid}`}>
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
