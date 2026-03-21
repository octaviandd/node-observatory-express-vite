/** @format */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/base/card";
import { Badge } from "@/components/ui/base/badge";
import { Button } from "@/components/ui/base/button";
import { ExternalLinkIcon } from "lucide-react";
import { Link } from "react-router";
import {
  JobInstanceResponse,
  RequestInstanceResponse,
  ScheduleInstanceResponse,
} from "@/hooks/useApiTyped";

export default function Source({
  source,
}: {
  source:
    | RequestInstanceResponse
    | JobInstanceResponse
    | ScheduleInstanceResponse;
}) {
  const isRequest = source.type === "request";
  const isJob = source.type === "job";

  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle>Source</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-sm text-muted-foreground">UUID</div>
            <div className="col-span-9 flex items-center gap-x-2 text-sm">
              {source.uuid}
              <Link to={`/${source.type}/${source.uuid}`} className="ml-auto">
                <Button variant="outline" size="sm">
                  <ExternalLinkIcon className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-sm text-muted-foreground">Type</div>
            <div className="col-span-9 text-sm capitalize">{source.type}</div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-sm text-muted-foreground">
              {isRequest ? "Route" : isJob ? "Queue" : "Schedule ID"}
            </div>
            <div className="col-span-9 text-sm">
              {isRequest
                ? (source as RequestInstanceResponse).content.data.route
                : isJob
                  ? (source as JobInstanceResponse).content.data.queue
                  : (source as ScheduleInstanceResponse).content.data
                      .scheduleId}
            </div>
          </div>

          {isRequest && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Method
              </div>
              <div className="col-span-9">
                <Badge variant="outline">
                  {(
                    source as RequestInstanceResponse
                  ).content.data.method.toUpperCase()}
                </Badge>
              </div>
            </div>
          )}

          {isJob && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Job ID
              </div>
              <div className="col-span-9 text-sm">
                {(source as JobInstanceResponse).content.data.jobId ?? "—"}
              </div>
            </div>
          )}

          {!isRequest && !isJob && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Cron
              </div>
              <div className="col-span-9 text-sm font-mono">
                {(source as ScheduleInstanceResponse).content.data
                  .cronExpression ?? "—"}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
