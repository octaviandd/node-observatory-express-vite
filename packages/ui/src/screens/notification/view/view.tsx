/** @format */

import { useState } from "react";
import { NotificationCrumbs } from "./crumbs";
import { NotificationInstanceResponse } from "../../../../types";
import Details from "./details";
import ContentTabs from "./tabs";
import {
  ViewPageLayout,
  useViewData,
  Source,
} from "@/components/ui/view-page";

export default function NotificationView() {
  const [activeTab, setActiveTab] = useState("raw");

  const { data: notification, loading, error, source } = useViewData<NotificationInstanceResponse>({
    endpoint: "notifications",
    dataKey: "notification",
  });

  return (
    <ViewPageLayout loading={loading} error={error}>
      {notification && (
        <>
          <NotificationCrumbs notification={notification} />
          {source && <Source source={source} />}
          <Details notification={notification} />
          <ContentTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            data={{ notification, loading: false, error: null, source }}
          />
        </>
      )}
    </ViewPageLayout>
  );
}
