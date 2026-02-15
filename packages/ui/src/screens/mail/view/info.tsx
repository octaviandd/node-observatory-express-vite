/** @format */

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { timeAgo } from "@/utils.js";
import { formatDuration } from "@/utils.js";
import { Badge } from "@/components/ui/badge";
import { MailInstanceResponse } from "@/hooks/useApiTyped";

export default function MailPreviewInfo({
  mail,
}: {
  mail: MailInstanceResponse;
}) {
  return (
    <Card className="rounded-none shadow-xs">
      <CardHeader>
        <CardTitle>Mail Details</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-y-4">
        <div className="grid grid-cols-12 items-center">
          <div className="col-span-3 text-muted-foreground">Time</div>
          <div className="col-span-9">
            {new Date(mail.created_at)
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
              ({timeAgo(mail.created_at)})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12 items-center">
          <div className="col-span-3 text-muted-foreground">Status</div>
          <div className="col-span-9">
            <Badge
              variant={
                mail.content.status === "completed"
                  ? "secondary"
                  : "destructive"
              }
            >
              {mail.content.status?.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-12 items-center">
          <div className="col-span-3 text-muted-foreground">Duration</div>
          <div className="col-span-9">
            {mail.content.duration
              ? formatDuration(mail.content.duration)
              : "N/A"}
          </div>
        </div>

        {mail.content.data.from && (
          <div className="grid grid-cols-12 items-center">
            <div className="col-span-3 text-muted-foreground">From</div>
            <div className="col-span-9">{mail.content.data.from}</div>
          </div>
        )}

        {mail.content.data.to && (
          <div className="grid grid-cols-12 items-center">
            <div className="col-span-3 text-muted-foreground">To</div>
            <div className="col-span-9">
              {Array.isArray(mail.content.data.to)
                ? mail.content.data.to.join(", ")
                : mail.content.data.to}
            </div>
          </div>
        )}

        {mail.content.data.subject && (
          <div className="grid grid-cols-12 items-center">
            <div className="col-span-3 text-muted-foreground">Subject</div>
            <div className="col-span-9">{mail.content.data.subject}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
