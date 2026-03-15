/** @format */
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/base/card";
import { timeAgo } from "@/utils.js";
import { ExceptionInstanceResponse } from "@/hooks/useApiTyped";

export const Details = ({
  exception,
}: {
  exception: ExceptionInstanceResponse;
}) => {
  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-sm text-muted-foreground">Time</div>
            <div className="col-span-9 text-sm">
              {new Date(exception.created_at).toLocaleString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
              })}{" "}
              ({timeAgo(exception.created_at)})
            </div>
          </div>

          {exception.content.data.title && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                Title
              </div>
              <div className="col-span-9 text-sm">
                {exception.content.data.title}
              </div>
            </div>
          )}

          {exception.content.data.file && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                File
              </div>
              <div className="col-span-9 text-sm">
                {exception.content.data.file}
              </div>
            </div>
          )}

          {exception.content.data.line && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">
                line
              </div>
              <div className="col-span-9 text-sm">
                {exception.content.data.line}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
