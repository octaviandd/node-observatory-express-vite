/** @format */

import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/base/card";
import { getSize, timeAgo, formatDuration } from "@/utils.js";
import { Badge } from "@/components/ui/base/badge";
import { HttpClientInstanceResponse } from "@/hooks/useApiTyped";

export const Details = ({ http }: { http: HttpClientInstanceResponse }) => {
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
                {new Date(http.created_at).toLocaleString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  second: "numeric",
                })}{" "}
                ({timeAgo(http.created_at)})
              </div>
            </div>

            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-muted-foreground">Status</div>
              <div className="col-span-9">
                <Badge
                  variant={
                    String(http.content.data.statusCode).startsWith("2")
                      ? "secondary"
                      : String(http.content.data.statusCode).startsWith("4")
                        ? "warning"
                        : "destructive"
                  }
                >
                  {http.content.data.statusCode}
                </Badge>
              </div>
            </div>

            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-muted-foreground">Method</div>
              <div className="col-span-9">
                <Badge variant="secondary">
                  {(http.content.data.method ?? http.content.metadata?.method ?? "").toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-muted-foreground">URL</div>
              <div className="col-span-9">
                {http.content.data.origin
                  ? (http.content.data.origin + (http.content.data.pathname ?? http.content.data.path ?? ""))
                  : (http.content.data.hostname ?? "") + (http.content.data.pathname ?? "")}
              </div>
            </div>

            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-muted-foreground">Duration</div>
              <div className="col-span-9">
                {formatDuration(http.content.duration as number)}
              </div>
            </div>

            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-muted-foreground">
                Response Size
              </div>
              <div className="col-span-9">
                {getSize(http.content.data.responseBodySize ?? 0)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
