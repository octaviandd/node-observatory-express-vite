/** @format */

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@/components/ui/base/breadcrumb";
import { Badge } from "@/components/ui/base/badge";
import { Card, CardContent } from "@/components/ui/base/card";
import { ChevronRight } from "lucide-react";
import { MailInstanceResponse } from "@/hooks/useApiTyped";

export default function MailCrumbs({ mail }: { mail: MailInstanceResponse }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-y-4 p-6">
        <Breadcrumb className="flex items-center gap-x-4">
          <BreadcrumbItem>
            <BreadcrumbLink href="/mails" className="text-muted-foreground">
              Mails
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem className="text-muted-foreground px-2">
            <ChevronRight className="h-3 w-3" />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink className="text-muted-foreground">
              {mail.content.data.to}
            </BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <div className="flex items-center gap-x-4">
          <Badge variant="secondary">{mail.content.metadata.package}</Badge>
          <Badge
            variant={!mail.content.error?.code ? "secondary" : "destructive"}
          >
            {!mail.content.error?.code ? "FAILED" : "COMPLETED"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
