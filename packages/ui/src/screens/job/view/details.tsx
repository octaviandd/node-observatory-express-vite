import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDuration, timeAgo } from "@/utils.js";
import { JobInstanceResponse } from "@/hooks/useApiTyped";

export default function Details({ job }: { job: JobInstanceResponse }) {
  return (
    <Card className="rounded-none shadow-xs">
      <CardHeader>
        <CardTitle>Job Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-sm text-muted-foreground">Time</div>
            <div className="col-span-9 text-sm">
              {new Date(job.created_at)
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
                ({timeAgo(job.created_at)})
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
                  job.content.status === "failed"
                    ? "destructive"
                    : "secondary"
                }
              >
                {(job.content.status ?? "").toUpperCase()}
              </Badge>
            </div>
          </div>

          {job.content.duration !== undefined && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Duration
              </div>
              <div className="col-span-9 text-sm">
                {formatDuration(job.content.duration)}
              </div>
            </div>
          )}

          {job.content.metadata.package && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Package
              </div>
              <div className="col-span-9">
                <Badge variant="secondary" className="capitalize">
                  {job.content.metadata.package}
                </Badge>
              </div>
            </div>
          )}

          {job.content.data.queue && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Queue
              </div>
              <div className="col-span-9 text-sm">{job.content.data.queue}</div>
            </div>
          )}

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-sm text-muted-foreground">
              Attempts Made
            </div>
            <div className="col-span-9 text-sm">{job.content.data.attemptsMade}</div>
          </div>

          {job.content.data.failedReason && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Failed Reason
              </div>
              <div className="col-span-9 text-sm">{job.content.data.failedReason}</div>
            </div>
          )}

          {job.content.metadata.method && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Method
              </div>
              <div className="col-span-9 text-sm">{job.content.metadata.method}</div>
            </div>
          )}

          {job.content.location?.file && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                File
              </div>
              <div className="col-span-9 text-sm">{job.content.location.file}</div>
            </div>
          )}

          {job.content.location?.line && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Line
              </div>
              <div className="col-span-9 text-sm">{job.content.location.line}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
