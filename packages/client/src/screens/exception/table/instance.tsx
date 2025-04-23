/** @format */

import { Bug, ExternalLink, Link as LinkIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { memo, ReactNode } from "react";
import { Link } from "react-router";
import { formatDate } from "@/utils.js";
import { ExceptionInstanceResponse } from "../../../../types";

type Props = {
  data: ExceptionInstanceResponse[];
  setSidePanelData: ({
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

export const InstanceTable = memo(
  ({ data, setSidePanelData, children }: Props) => {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Date</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((exception: ExceptionInstanceResponse) => (
              <TableRow key={exception.uuid}>
                <TableCell className="font-medium text-muted-foreground">
                  {formatDate(exception.created_at)}
                </TableCell>
                <TableCell className="flex items-center gap-2 h-[53px]">
                  <Bug className="h-4 w-4 text-muted-foreground" />
                  <span className="text-black dark:text-white ml-2">
                    {exception.content.message}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setSidePanelData({
                          isOpen: true,
                          modelId: exception.uuid ?? "",
                          requestId: exception.request_id ?? "",
                          jobId: exception.job_id ?? "",
                          scheduleId: exception.schedule_id ?? "",
                        })
                      }
                    >
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Link to={`/exception/${exception.uuid}`}>
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
