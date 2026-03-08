/** @format */

import { RequestCrumbs } from "./crumbs";
import { RequestPreviewInfo } from "./info";
import { Details } from "./details";
import { RequestPreviewUser } from "./user";
import { RequestPreviewNotifications } from "./notifications";
import { useParams } from "react-router";
import { Card, CardContent } from "@/components/ui/base/card";
import { Skeleton } from "@/components/ui/base/skeleton";
import { Alert, AlertDescription } from "@/components/ui/base/alert";
import { RequestPreviewTabs } from "./tabs";
import { useRequests } from "@/hooks/useApiTyped";

export default function RequestPreview() {
  const { id } = useParams<{ id: string }>();
  
  const { data, isLoading, isError } = useRequests.useGet(id!);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to fetch request data</AlertDescription>
      </Alert>
    );
  }

  const request = data.request?.[0];
  const queries = data.query ?? [];
  const https = data.http ?? [];
  const jobs = data.job ?? [];
  const caches = data.cache ?? [];
  const notifications = data.notification ?? [];
  const mails = data.mail ?? [];
  const logs = data.log ?? [];
  const exceptions = data.exception ?? [];
  const views = data.view ?? [];
  const models = data.model ?? [];

  if (!request) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Request data not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-y-6">
      <RequestCrumbs request={request} />

      <Card>
        <CardContent className="grid grid-cols-2 gap-x-10 p-1">
          <RequestPreviewInfo request={request} />
          <Details
            queries={queries}
            caches={caches}
            https={https}
            jobs={jobs}
            exceptions={exceptions}
            views={views}
            models={models}
          />
          <RequestPreviewUser request={request} />
          <RequestPreviewNotifications
            mails={mails}
            notifications={notifications}
            logs={logs}
          />
        </CardContent>
      </Card>

      <RequestPreviewTabs 
        data={{ 
          request, 
          notifications, 
          mails, 
          logs, 
          queries, 
          https, 
          jobs, 
          caches, 
          exceptions, 
          views, 
          models 
        }} 
      />
    </div>
  );
}