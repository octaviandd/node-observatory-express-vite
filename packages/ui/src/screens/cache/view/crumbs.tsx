/** @format */

import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { CacheInstanceResponse } from "@/hooks/useApiTyped";

export const CacheCrumbs = React.memo(
  ({ cache }: { cache: CacheInstanceResponse }) => {
    return (
      <Card>
        <CardContent className="flex flex-col gap-y-4 p-6">
          <Breadcrumb className="flex items-center gap-x-4">
            <BreadcrumbItem>
              <BreadcrumbLink href="/caches" className="text-muted-foreground">
                Caches
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem className="text-muted-foreground px-2">
              <ChevronRight className="h-3 w-3" />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink className="text-muted-foreground">
                {cache.content.data.key}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
          <div className="flex items-center gap-x-4">
            <Badge variant="secondary">
              {cache.content.metadata.package.toUpperCase()}
            </Badge>
            <Badge
              variant={
                cache.content.data.misses
                  ? "destructive"
                  : cache.content.data.writes
                    ? "warning"
                    : "secondary"
              }
            >
              {cache.content.data.misses
                ? "MISS"
                : cache.content.data.writes
                  ? "WRITE"
                  : "HIT"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  },
);
