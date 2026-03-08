/** @format */

import { useState } from "react";
import { JobPreviewCrumbs } from "./crumbs";
import { JobMetadata } from "./metadata";
import JobDetails from "./details";
import ContentTabs from "./tabs";
import { CacheInstanceResponse, ExceptionInstanceResponse, HttpClientInstanceResponse, JobInstanceResponse, LogInstanceResponse, MailInstanceResponse, ModelInstanceResponse, NotificationInstanceResponse, QueryInstanceResponse, RequestInstanceResponse } from "@/hooks/useApiTyped";
import { ViewLayout } from "@/components/ui/layout/view-layout";
import { useViewData } from "@/hooks/useViewData";
import Source from "./source";

export default function JobPreview() {
  const [activeTab, setActiveTab] = useState("raw");

  const { data: job, loading, error, rawResponse } = useViewData<JobInstanceResponse>({
    endpoint: "jobs",
    dataKey: "job",
  });

  // Extract related data from raw response
  const queries = (rawResponse?.query as QueryInstanceResponse[]) ?? [];
  const caches = (rawResponse?.cache as CacheInstanceResponse[]) ?? [];
  const https = (rawResponse?.http as HttpClientInstanceResponse[]) ?? [];
  const notifications = (rawResponse?.notification as NotificationInstanceResponse[]) ?? [];
  const mails = (rawResponse?.mail as MailInstanceResponse[]) ?? [];
  const logs = (rawResponse?.log as LogInstanceResponse[]) ?? [];
  const exceptions = (rawResponse?.exception as ExceptionInstanceResponse[]) ?? [];
  const models = (rawResponse?.model as ModelInstanceResponse[]) ?? [];
  const requests = (rawResponse?.request as RequestInstanceResponse[]) ?? [];

  return (
    <ViewLayout loading={loading} error={error}>
      {job && (
        <>
          <JobPreviewCrumbs job={job} />

          {requests.length > 0 && <Source source={requests[0]} />}

          <JobDetails job={job} />

          <JobMetadata
            queries={queries}
            caches={caches}
            https={https}
            notifications={notifications}
            mails={mails}
            logs={logs}
            exceptions={exceptions}
          />

          <ContentTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            data={{
              job,
              notifications,
              mails,
              logs,
              queries,
              caches,
              https,
              exceptions,
              models,
            }}
          />
        </>
      )}
    </ViewLayout>
  );
}
