/** @format */

import { ExternalLink, Link2 } from "lucide-react";
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
import { formatDate } from "@/utils.js";
import { memo, ReactNode, useContext } from "react";
import { CacheInstanceResponse } from "@/hooks/useApiTyped";
import { StoreContext } from "@/store";

type Props = {
  data: CacheInstanceResponse[];
  children: ReactNode;
};

export const InstanceTable = memo((props: Props) => {
  const { data, children } = props;
  const { dispatch } = useContext(StoreContext);

  const getStatusVariant = (hits?: number, writes?: number, misses?: number) => {
    if (hits && hits > 0) {
      if (writes && writes > 0) return "secondary";
      return "secondary";
    }
    if (writes && writes > 0) return "warning";
    if (misses && misses > 0) return "error";
    return "secondary";
  };

  const getStatusText = (hits?: number, writes?: number, misses?: number) => {
     if (hits && hits > 0) {
      if (writes && writes > 0) return "HIT + WRITE";
      return "HIT";
    }
    if (writes && writes > 0) return "WRITE";
    if (misses && misses > 0) return "MISS";
    return "HIT";
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
          {data.map((cache: CacheInstanceResponse) => (
            <TableRow key={cache.uuid}>
              <TableCell className="font-medium text-muted-foreground">
                {formatDate(cache.created_at)}
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-2">
                  <p className="text-muted-foreground">
                    [{cache.content.metadata.command.toUpperCase()}]
                  </p>
                  <p className="text-black dark:text-white">
                    {cache.content.data.key as string}
                  </p>
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={getStatusVariant(
                    cache.content.data.hits,
                    cache.content.data.writes,
                    cache.content.data.misses,
                  )}
                >
                  {getStatusText(
                    cache.content.data.hits,
                    cache.content.data.writes,
                    cache.content.data.misses,
                  )}
                </Badge>
              </TableCell>
              <TableCell>
                <p
                  className={
                    Number(cache.content.duration) > 999
                      ? "text-yellow-600"
                      : "text-black dark:text-white"
                  }
                >
                  {cache.content.duration && cache.content?.duration.toFixed(6)}
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
                          modelId: cache.uuid ?? "",
                          requestId: cache.request_id ?? "",
                          jobId: cache.job_id ?? "",
                          scheduleId: cache.schedule_id ?? "",
                        },
                      })
                    }
                  >
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Link to={`/cache/${cache.uuid}`}>
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
