/** @format */

import { useState } from "react";
import { NotificationCrumbs } from "./crumbs";
import { Details } from "./details";
import ContentTabs from "./tabs";
import { NotificationInstanceResponse } from "@/hooks/useApiTyped";
import { ViewLayout } from "@/components/ui/layout/view-layout";
import { useViewData } from "@/hooks/useViewData";
import Source from "./source";

export default function NotificationView() {
  const [activeTab, setActiveTab] = useState("raw");

  const { data: notification, loading, error, source } = useViewData<NotificationInstanceResponse>({
    endpoint: "notifications",
    dataKey: "notification",
  });

  return (
    <ViewLayout loading={loading} error={error}>
      {notification && (
        <>
          <NotificationCrumbs notification={notification} />
          {source && <Source source={source} />}
          <Details notification={notification} />
          <ContentTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            data={{ notification }}
          />
        </>
      )}
    </ViewLayout>
  );
}
