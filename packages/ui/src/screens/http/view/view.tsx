/** @format */

import { useState } from "react";
import { HTTPCrumbs } from "./crumbs";
import { HTTPInfo } from "./info";
import ContentTabs from "./tabs";
import {
  ViewPageLayout,
  useViewData,
  Source,
} from "@/components/ui/view-page";
import { HttpClientInstanceResponse } from "../../../../types";

export default function HTTPView() {
  const [activeTab, setActiveTab] = useState("raw");
  
  const { data, loading, error, source } = useViewData<HttpClientInstanceResponse>({
    endpoint: "http",
    dataKey: "http",
  });

  return (
    <ViewPageLayout loading={loading} error={error}>
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
    </ViewPageLayout>
  );
}
