/** @format */

import { useState } from "react";
import { CacheCrumbs } from "./crumbs";
import { Details } from "./details";
import ContentTabs from "./tabs";
import { CacheInstanceResponse } from "@/hooks/useApiTyped";
import { ViewLayout } from "@/components/ui/layout/view-layout";
import { useViewData } from "@/hooks/useViewData";
import Source from "./source";

export default function CachePreview() {
  const [activeTab, setActiveTab] = useState("raw");

  const { data: cache, loading, error, source } = useViewData<CacheInstanceResponse>({
    endpoint: "cache",
    dataKey: "cache",
  });

  return (
    <ViewLayout loading={loading} error={error}>
      {cache && (
        <>
          <CacheCrumbs cache={cache} />
          {source && <Source source={source} />}
          <Details cache={cache} />
          <ContentTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            data={{ cache, loading: false }}
          />
        </>
      )}
    </ViewLayout>
  );
}
