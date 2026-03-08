/** @format */

import { useState } from "react";
import { HTTPCrumbs } from "./crumbs";
import { HTTPInfo } from "./info";
import ContentTabs from "./tabs";
import { HttpClientInstanceResponse } from "@/hooks/useApiTyped";
import { ViewLayout } from "@/components/ui/layout/view-layout";
import { useViewData } from "@/hooks/useViewData";
import Source from "./source";

export default function HTTPView() {
  const [activeTab, setActiveTab] = useState("raw");
  
  const { data, loading, error, source } = useViewData<HttpClientInstanceResponse>({
    endpoint: "https",
    dataKey: "http",
  });

  return (
    <ViewLayout loading={loading} error={error}>
      {data && (
        <>
          <HTTPCrumbs http={data} />
          {source && <Source source={source} />}
          <HTTPInfo http={data} />
          <ContentTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            data={{ http: data }}
          />
        </>
      )}
    </ViewLayout>
  );
}
