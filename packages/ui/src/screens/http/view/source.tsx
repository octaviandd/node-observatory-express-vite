import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobInstanceResponse, RequestInstanceResponse, ScheduleInstanceResponse } from "@/hooks/useApiTyped";
import { ExternalLinkIcon } from "lucide-react";
import { Link } from "react-router";

export default function Source({
  source,
}: {
  source:
  | RequestInstanceResponse
  | JobInstanceResponse
  | ScheduleInstanceResponse;
}) {
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
              <Link to={`/${source.type}/${source.uuid}`} className="ml-auto">
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

          {"data" in source.content && "route" in (source.content.data as any) && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-muted-foreground">Route</div>
              <div className="col-span-9">
                {(source.content.data as any).route}
              </div>
            </div>
          )}

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Method</div>
            <div className="col-span-9">
              <Badge variant="outline">
                {((source.content.metadata as any)?.method ?? "").toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
