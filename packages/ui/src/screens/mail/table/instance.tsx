/** @format */

import { ExternalLink, Link2, Mail } from "lucide-react";
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
import { memo, ReactNode, useContext } from "react";
import { formatDuration, formatDate } from "@/utils.js";
import { MailInstanceResponse } from "@/hooks/useApiTyped";
import { StoreContext } from "@/store";

type Props = {
  data: MailInstanceResponse[];
  children: ReactNode;
};

export const InstanceTable = memo(({ data, children }: Props) => {
  const { dispatch } = useContext(StoreContext);
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
          {data.map((mail: MailInstanceResponse) => (
            <TableRow key={mail.uuid}>
              <TableCell className="font-medium text-muted-foreground">
                {formatDate(mail.created_at)}
              </TableCell>
              <TableCell className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {mail.content.data.to}
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={!mail.content.error?.code ? "secondary" : "error"}
                >
                  {mail.content.error?.code ? "Failed" : "Completed"}
                </Badge>
              </TableCell>
              <TableCell>
                <p
                  className={
                    mail.content.metadata.duration > 999
                      ? "text-yellow-600"
                      : "text-black dark:text-white"
                  }
                >
                  {formatDuration(mail.content.metadata.duration ?? 0)}
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
                          modelId: mail.uuid ?? "",
                          requestId: mail.request_id ?? "",
                          jobId: mail.job_id ?? "",
                          scheduleId: mail.schedule_id ?? "",
                        },
                      })
                    }
                  >
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Link to={`/mail/${mail.uuid}`}>
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
