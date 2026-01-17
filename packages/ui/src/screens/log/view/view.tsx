/** @format */

import { useState } from "react";
import { LogCrumbs } from "./crumbs";
import { LogInstanceResponse } from "../../../../types";
import ContentTabs from "./tabs";
import Details from "./details";
import {
  ViewPageLayout,
  useViewData,
  Source,
} from "@/components/ui/view-page";

export default function LogView() {
  const [activeTab, setActiveTab] = useState("raw");

  const { data: log, loading, error, source } = useViewData<LogInstanceResponse>({
    endpoint: "logs",
    dataKey: "log",
  });

  return (
    <ViewPageLayout loading={loading} error={error}>
      {log && (
        <>
          <LogCrumbs log={log} />
          {source && <Source source={source} />}
          <Details log={log} />
          <ContentTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            data={{ log }}
          />
        </>
      )}
    </ViewPageLayout>
  );
}
