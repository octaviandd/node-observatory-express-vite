import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/base/card";
import { Badge } from "@/components/ui/base/badge";
import { formatDuration, timeAgo } from "@/utils.js";
import { QueryInstanceResponse } from "@/hooks/useApiTyped";

export default function Details({ query }: { query: QueryInstanceResponse }) {
  return (
    <Card className="rounded-none shadow-xs">
      <CardHeader>
        <CardTitle>Query Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-sm text-muted-foreground">Time</div>
            <div className="col-span-9 text-sm">
              {new Date(query.created_at)
                .toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "numeric",
                  second: "numeric",
                  hour12: false,
                })
                .replace(",", "")}
              <span className="text-xs text-muted-foreground ml-2">
                ({timeAgo(query.created_at)})
              </span>
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-sm text-muted-foreground">
              Status
            </div>
            <div className="col-span-9">
              <Badge
                variant={
                  query.content.status === "failed"
                    ? "destructive"
                    : "secondary"
                }
              >
                {(query.content.status ?? "").toUpperCase()}
              </Badge>
            </div>
          </div>

          {query.content.duration !== undefined && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Duration
              </div>
              <div className="col-span-9 text-sm">
                {formatDuration(query.content.duration)}
              </div>
            </div>
          )}

          {query.content.metadata.package && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Package
              </div>
              <div className="col-span-9">
                <Badge variant="secondary" className="capitalize">
                  {query.content.metadata.package}
                </Badge>
              </div>
            </div>
          )}

          {query.content.metadata.sqlType && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                SQL Type
              </div>
              <div className="col-span-9">
                <Badge variant="secondary" className="capitalize">
                  {query.content.metadata.sqlType}
                </Badge>
              </div>
            </div>
          )}

          {query.content.data.sql && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                SQL
              </div>
              <div className="col-span-9">
                <Badge variant="secondary" className="capitalize">
                  {query.content.data.sql}
                </Badge>
              </div>
            </div>
          )}

          {query.content.data.hostname && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Host
              </div>
              <div className="col-span-9 text-sm">{query.content.data.hostname}</div>
            </div>
          )}

          {query.content.data.port && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Port
              </div>
              <div className="col-span-9">
                <Badge variant="outline">{query.content.data.port}</Badge>
              </div>
            </div>
          )}

          {query.content.data.database && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Database
              </div>
              <div className="col-span-9 text-sm">{query.content.data.database}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
