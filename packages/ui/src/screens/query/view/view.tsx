/** @format */

import { useState } from "react";
import { QueryCrumbs } from "./crumbs";
import {Details} from "./details";
import ContentTabs from "./tabs";
import { QueryInstanceResponse } from "@/hooks/useApiTyped";
import { ViewLayout } from "@/components/ui/layout/view-layout";
import { useViewData } from "@/hooks/useViewData";
import Source from "./source";

export default function QueryPreview() {
  const [activeTab, setActiveTab] = useState("raw");

  const { data: query, loading, error, source } = useViewData<QueryInstanceResponse>({
    endpoint: "queries",
    dataKey: "query",
  });

  return (
    <ViewLayout
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
    </ViewLayout>
  );
}
