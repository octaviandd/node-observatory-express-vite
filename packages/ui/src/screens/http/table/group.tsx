/** @format */

import {
  ExternalLink,
  Globe,
  AlertCircle,
  AlertOctagon,
  CheckCircle,
} from "lucide-react";
import { Link } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { memo, ReactNode } from "react";
import { formatCount, formatDuration } from "@/utils.js";
import { HttpClientGroupResponse } from "../../../../types";

type Props = {
  data: HttpClientGroupResponse[];
  children: ReactNode;
};

export const GroupTable = memo(({ data, children }: Props) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>P95</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((request: HttpClientGroupResponse) => (
            <TableRow key={request.route}>
              <TableCell className="flex items-center gap-2 h-[53px]">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {request.route}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Badge
                    variant="secondary"
                    className="flex gap-1 items-center"
                  >
                    <CheckCircle className="h-3 w-3" />
                    {formatCount(request.count_200)}
                  </Badge>
                  {request.count_400 > 0 && (
                    <Badge
                      variant="warning"
                      className="flex gap-1 items-center"
                    >
                      <AlertCircle className="h-3 w-3" />
                      {formatCount(request.count_400)}
                    </Badge>
                  )}
                  {request.count_500 > 0 && (
                    <Badge variant="error" className="flex gap-1 items-center">
                      <AlertOctagon className="h-3 w-3" />
                      {formatCount(request.count_500)}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <p
                  className={
                    request.average && request.average > 999
                      ? "text-yellow-600"
                      : "text-black dark:text-white"
                  }
                >
                  {formatDuration(request.average)}
                </p>
              </TableCell>
              <TableCell>
                <p
                  className={
                    request.p95 > 999
                      ? "text-yellow-600"
                      : "text-black dark:text-white"
                  }
                >
                  {formatDuration(request.p95)}
                </p>
              </TableCell>
              <TableCell>
                <Link to={`${encodeURIComponent(request.route)}`}>
                  <Button variant="outline" size="icon">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {children}
    </div>
  );
});
