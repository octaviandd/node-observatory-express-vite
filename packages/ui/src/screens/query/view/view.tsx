/** @format */

import { useState } from "react";
import { QueryCrumbs } from "./crumbs";
import Details from "./details";
import ContentTabs from "./tabs";
import {
  ViewPageLayout,
  useViewData,
  Source,
} from "@/components/ui/view-page";
import { QueryInstanceResponse } from "@/hooks/useApiTyped";

export default function QueryPreview() {
  const [activeTab, setActiveTab] = useState("raw");

  const { data: query, loading, error, source } = useViewData<QueryInstanceResponse>({
    endpoint: "queries",
    dataKey: "query",
  });

  return (
    <ViewPageLayout
      loading={loading}
      error={error}
      skeletonHeights={[50, 150, 250, 300]}
    >
      {query && (
        <>
          <QueryCrumbs query={query} />
          {source && <Source source={source} />}
          <Details query={query} />
          <ContentTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            data={{ query }}
          />
        </>
      )}
    </ViewPageLayout>
  );
}
