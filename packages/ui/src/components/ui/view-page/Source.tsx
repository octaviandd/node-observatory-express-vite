/** @format */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RequestInstanceResponse,
  JobInstanceResponse,
  ScheduleInstanceResponse,
  RequestContent,
  JobContent,
  ScheduleContent,
} from "../../../../types";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { ExternalLinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SourceProps {
  source:
    | RequestInstanceResponse
    | JobInstanceResponse
    | ScheduleInstanceResponse;
}

export function Source({ source }: SourceProps) {
  const getLink = () => {
    switch (source.type) {
      case "request":
        return `/request/${source.uuid}`;
      case "job":
        return `/job/${source.uuid}`;
      case "schedule":
        return `/schedule/${source.uuid}`;
      default:
        return `/request/${source.uuid}`;
    }
  };

  const getSecondaryLabel = () => {
    switch (source.type) {
      case "request":
        return "Route";
      case "job":
        return "Job ID";
      case "schedule":
        return "Schedule ID";
      default:
        return "Route";
    }
  };

  const getSecondaryValue = () => {
    switch (source.type) {
      case "request":
        return (source.content as RequestContent).route;
      case "job":
        return (source.content as JobContent).jobId;
      case "schedule":
        return (source.content as ScheduleContent).scheduleId;
      default:
        return "";
    }
  };

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
              <Link to={getLink()} className="ml-auto">
                <Button variant="outline" size="sm">
                  <ExternalLinkIcon className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">
              {getSecondaryLabel()}
            </div>
            <div className="col-span-9">{getSecondaryValue()}</div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Type</div>
            <div className="col-span-9 capitalize">{source.type}</div>
          </div>

          {source.type === "request" && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-muted-foreground">Method</div>
              <div className="col-span-9">
                <Badge variant="outline">
                  {(source.content as RequestContent).method.toUpperCase()}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

