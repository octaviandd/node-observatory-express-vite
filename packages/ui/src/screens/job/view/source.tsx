import { BreadcrumbItem, BreadcrumbLink } from "@/components/ui/base/breadcrumb";
import { Breadcrumb } from "@/components/ui/base/breadcrumb";
import { Button } from "@/components/ui/base/button";
import { ExternalLinkIcon } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/base/card";
import { CardContent } from "@/components/ui/base/card";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { JobInstanceResponse, ScheduleInstanceResponse, RequestInstanceResponse } from "@/hooks/useApiTyped";

export default function Source({
  source,
}: {
  source:
  | JobInstanceResponse
  | ScheduleInstanceResponse
  | RequestInstanceResponse;
}) {
  return (
    <Card className="rounded-none">
      <CardContent className="">
        <CardHeader className="pb-5 px-0">
          <Breadcrumb className="flex items-center gap-x-4">
            <BreadcrumbItem>
              <BreadcrumbLink className="text-muted-foreground">
                Source
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem className="text-muted-foreground px-2">
              <ChevronRight className="h-3 w-3" />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink className="text-muted-foreground">
                {source.type}
              </BreadcrumbLink>
              <Link
                to={`/${source.type}/${source.uuid}`}
                className="text-muted-foreground ml-auto"
              >
                <Button variant="outline" size="sm" className="ml-2">
                  <ExternalLinkIcon className="h-3 w-3" />
                </Button>
              </Link>
            </BreadcrumbItem>
          </Breadcrumb>
        </CardHeader>
        <div className="flex flex-col gap-y-2">
          <div className="flex items-center gap-x-2">
            <span className="font-medium">UUID:</span> {source.uuid}
          </div>
          {"data" in source.content && "route" in (source.content.data as any) && (
            <div className="flex items-center gap-x-2">
              <span className="font-medium">Route:</span>{" "}
              {(source.content.data as any).route}
            </div>
          )}
          <div className="flex items-center gap-x-2">
            <span className="font-medium">Method:</span>{" "}
            {((source.content.metadata as any)?.method ?? "").toUpperCase()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
