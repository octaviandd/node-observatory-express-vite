import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/base/card";
import { formatDuration, timeAgo } from "@/utils.js";
import { Badge } from "@/components/ui/base/badge";
import { ModelInstanceResponse } from "@/hooks/useApiTyped";

export const Details = ({ model }: { model: ModelInstanceResponse }) => {
  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Time</div>
            <div className="col-span-9">
              {new Date(model.created_at).toLocaleString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
              })}{" "}
              ({timeAgo(model.created_at)})
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Status</div>
            <div className="col-span-9">
              <Badge
                variant={
                  model.content.status === "completed"
                    ? "secondary"
                    : "destructive"
                }
              >
                {model.content.status?.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Package</div>
            <div className="col-span-9">
              <Badge variant="outline">{model.content.metadata.package}</Badge>
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Model</div>
            <div className="col-span-9">{model.content.data.modelName}</div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Method</div>
            <div className="col-span-9">
              <Badge variant="secondary">{model.content.metadata.method}</Badge>
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">File</div>
            <div className="col-span-9">{model.content.location?.file}</div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Line</div>
            <div className="col-span-9">{model.content.location?.line}</div>
          </div>

          {model.content.duration && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-muted-foreground">Duration</div>
              <div className="col-span-9">
                {formatDuration(model.content.duration)}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
