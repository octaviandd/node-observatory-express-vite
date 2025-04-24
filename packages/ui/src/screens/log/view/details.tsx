import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { timeAgo } from "@/utils.js";
import { LogInstanceResponse } from "../../../../types";

export default function Details({ log }: { log: LogInstanceResponse }) {
  const LOG_LEVELS = [
    { dataKey: "info", variant: "secondary" },
    { dataKey: "warn", variant: "warning" },
    { dataKey: "error", variant: "error" },
    { dataKey: "debug", variant: "debug" },
    { dataKey: "trace", variant: "trace" },
    { dataKey: "fatal", variant: "error" },
    { dataKey: "log", variant: "log" },
  ];

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-sm text-muted-foreground">Time</div>
            <div className="col-span-9 text-sm">
              {new Date(log.created_at).toLocaleString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
              })}{" "}
              <span className="text-xs text-muted-foreground ml-2">
                ({timeAgo(log.created_at)})
              </span>
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-sm text-muted-foreground">
              Level
            </div>
            <div className="col-span-9 text-sm">
              <Badge
                variant={
                  LOG_LEVELS.find(
                    (level) => level.dataKey === log.content.level,
                  )?.variant as
                  | "secondary"
                  | "warning"
                  | "error"
                  | "debug"
                  | "trace"
                  | "log"
                  | "default"
                  | "destructive"
                  | "outline"
                  | "success"
                  | null
                  | undefined
                }
              >
                {log.content.level.toUpperCase()}
              </Badge>
            </div>
          </div>

          {log.content.message && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Message
              </div>
              <div className="col-span-9">
                <Badge variant="secondary" className="capitalize">
                  {typeof log.content.message === 'object' ? JSON.stringify(log.content.message) : log.content.message}
                </Badge>
              </div>
            </div>
          )}

          {log.content.package && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Package
              </div>
              <div className="col-span-9">
                <Badge variant="secondary" className="capitalize">
                  {log.content.package}
                </Badge>
              </div>
            </div>
          )}

          {log.content.file && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                File
              </div>
              <div className="col-span-9">
                <Badge variant="secondary" className="capitalize">
                  {log.content.file}
                </Badge>
              </div>
            </div>
          )}

          {log.content.line && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Lile
              </div>
              <div className="col-span-9">
                <Badge variant="secondary" className="capitalize">
                  {log.content.line}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
