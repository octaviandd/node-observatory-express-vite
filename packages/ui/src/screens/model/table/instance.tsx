/** @format */

import { ExternalLink, Link2, Cuboid } from "lucide-react";
import { memo, ReactNode, useContext } from "react";
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
import { formatDate, formatDuration } from "@/utils.js";
import { ModelInstanceResponse } from "@/hooks/useApiTyped";
import { StoreContext } from "@/store";

type Props = {
  data: ModelInstanceResponse[];
  children: ReactNode;
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
            <TableHead className="w-12.5"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((model: ModelInstanceResponse) => (
            <TableRow
              key={model.uuid}
              className={model.content.error?.code ? "bg-red-800/20" : ""}
            >
              <TableCell className="font-medium text-muted-foreground">
                {formatDate(model.created_at)}
              </TableCell>
              <TableCell className="flex items-center gap-2 h-[53px]">
                <Cuboid className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {model.content.data.modelName}
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    model.content.error?.code ? "destructive" : "secondary"
                  }
                >
                  {model.content.error?.code ? "Failed" : "Completed"}
                </Badge>
              </TableCell>
              <TableCell>
                <span
                  className={
                    model.content.metadata.duration > 999
                      ? "text-yellow-600"
                      : "text-black dark:text-white"
                  }
                >
                  {formatDuration(model.content.metadata.duration)}
                </span>
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
                          modelId: model.uuid ?? "",
                          requestId: model.request_id ?? "",
                          jobId: model.job_id ?? "",
                          scheduleId: model.schedule_id ?? "",
                        },
                      })
                    }
                  >
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Link to={`/model/${model.uuid}`}>
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
