/** @format */

import { useState, useEffect } from "react";
import { RequestCrumbs } from "./crumbs";
import { RequestPreviewInfo } from "./info";
import { RequestPreviewDetails } from "./details";
import { RequestPreviewUser } from "./user";
import { RequestPreviewNotifications } from "./notifications";
import { useParams } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RequestPreviewTabs } from "./tabs";
import { CacheInstanceResponse, ExceptionInstanceResponse, HttpClientInstanceResponse, JobInstanceResponse, LogInstanceResponse, MailInstanceResponse, ModelInstanceResponse, NotificationInstanceResponse, QueryInstanceResponse, RequestInstanceResponse, ViewInstanceResponse } from "../../../../../types";

export default function RequestPreview() {
  const params = useParams();
  const [data, setData] = useState<{
    request: RequestInstanceResponse | null
    notifications: NotificationInstanceResponse[] | [],
    mails: MailInstanceResponse[] | [],
    logs: LogInstanceResponse[] | [],
    queries: QueryInstanceResponse[] | [],
    https: HttpClientInstanceResponse[] | [],
    jobs: JobInstanceResponse[] | [],
    caches: CacheInstanceResponse[] | [],
    exceptions: ExceptionInstanceResponse[] | [],
    views: ViewInstanceResponse[] | [],
    models: ModelInstanceResponse[] | [],
  }>({
    request: null,
    notifications: [],
    mails: [],
    logs: [],
    queries: [],
    https: [],
    jobs: [],
    caches: [],
    exceptions: [],
    views: [],
    models: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getItem();
  }, [params.id]);

  const getItem = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/observatory-api/data/requests/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch request data');
      }
      const result = await response.json();
      const { request, query, http, job, cache, notification, mail, log, exception, view, model } = result;

      if (!request?.[0]) {
        throw new Error('Request data not found');
      }

      setData({
        request: request[0],
        queries: query ?? [],
        https: http ?? [],
        jobs: job ?? [],
        caches: cache ?? [],
        notifications: notification ?? [],
        mails: mail ?? [],
        logs: log ?? [],
        exceptions: exception ?? [],
        views: view ?? [],
        models: model ?? [],
      });
    } catch (error) {
      console.error('Error fetching request data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-y-6">
      {data.request && <RequestCrumbs request={data.request} />}
      

      <Card>
        <CardContent className="grid grid-cols-2 gap-x-10 p-5">
          {data.request && <RequestPreviewInfo request={data.request} />}
          <RequestPreviewDetails
            queries={data.queries}
            caches={data.caches}
            https={data.https}
            jobs={data.jobs}
            exceptions={data.exceptions}
            views={data.views}
            models={data.models}
          />
          {data.request && <RequestPreviewUser request={data.request} />}
          <RequestPreviewNotifications
            mails={data.mails}
            notifications={data.notifications}
            logs={data.logs}
          />
        </CardContent>
      </Card>

      {data.request && <RequestPreviewTabs data={{...data, request: data.request}} />}
    </div>
  );
}
