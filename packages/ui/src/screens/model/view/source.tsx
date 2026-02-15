import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { ExternalLinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { JobInstanceResponse, RequestInstanceResponse, ScheduleInstanceResponse } from "@/hooks/useApiTyped";

type Props = {
  source:
  | RequestInstanceResponse
  | JobInstanceResponse
  | ScheduleInstanceResponse;
};

export default function Source({ source }: Props) {
  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle>Source</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">UUID</div>
            <div className="col-span-9 flex items-center gap-x-2">
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
            <div className="col-span-3 text-muted-foreground">Type</div>
            <div className="col-span-9">{source.type}</div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">
              {source.type === "request"
                ? "Route"
                : source.type === "job"
                  ? "Job ID"
                  : "Schedule ID"}
            </div>
            <div className="col-span-9">
              {source.type === "request"
                ? (source.content.data as any).route
                : source.type === "job"
                  ? (source.content.data as any).jobId
                  : (source.content.metadata as any).scheduleId}
            </div>
          </div>

          {source.type === "request" && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-muted-foreground">Method</div>
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
