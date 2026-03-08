import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/base/card";
import { Badge } from "@/components/ui/base/badge";
import { Button } from "@/components/ui/base/button";
import { ExternalLinkIcon } from "lucide-react";
import { Link } from "react-router";
import { RequestInstanceResponse, JobInstanceResponse, ScheduleInstanceResponse } from "@/hooks/useApiTyped";

export default function Source({
  source,
}: {
  source:
  | RequestInstanceResponse
  | JobInstanceResponse
  | ScheduleInstanceResponse;
}) {
  return (
    <Card className="rounded-none shadow-xs">
      <CardHeader>
        <CardTitle>Source</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-sm text-muted-foreground">UUID</div>
            <div className="col-span-9 flex items-center gap-x-2 text-sm">
              {source.uuid}
              <Link
                to={`/${source.type}/${source.uuid}`}
                className="ml-auto"
              >
                <Button variant="outline" size="sm">
                  <ExternalLinkIcon className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-sm text-muted-foreground">
              {source.type === "request"
                ? "Route"
                : source.type === "job"
                  ? "Job ID"
                  : "Schedule ID"}
            </div>
            <div className="col-span-9 text-sm">
              {source.type === "request"
                ? (source.content.data as any).route
                : source.type === "job"
                  ? (source.content.data as any).jobId
                  : (source.content.metadata as any).scheduleId}
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-sm text-muted-foreground">Type</div>
            <div className="col-span-9 text-sm capitalize">{source.type}</div>
          </div>

          {source.type === "request" && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Method
              </div>
              <div className="col-span-9">
                <Badge variant="outline">
                  {((source.content.metadata as any)?.method ?? "").toUpperCase()}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
