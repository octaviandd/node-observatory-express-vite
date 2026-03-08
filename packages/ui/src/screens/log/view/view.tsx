/** @format */

import { useState } from "react";
import { LogCrumbs } from "./crumbs";
import ContentTabs from "./tabs";
import Details from "./details";
import { LogInstanceResponse } from "@/hooks/useApiTyped";
import { ViewLayout } from "@/components/ui/layout/view-layout";
import { useViewData } from "@/hooks/useViewData";
import Source from "./source";

export default function LogView() {
  const [activeTab, setActiveTab] = useState("raw");

  const { data: log, loading, error, source } = useViewData<LogInstanceResponse>({
    endpoint: "logs",
    dataKey: "log",
  });

  return (
    <ViewLayout loading={loading} error={error}>
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
    </ViewLayout>
  );
}
