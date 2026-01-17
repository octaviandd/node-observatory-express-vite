/** @format */

import { useState } from "react";
import { CacheCrumbs } from "./crumbs";
import { CachePreviewInfo } from "./info";
import { CacheInstanceResponse } from "../../../../types";
import ContentTabs from "./tabs";
import {
  ViewPageLayout,
  useViewData,
  Source,
} from "@/components/ui/view-page";

export default function CachePreview() {
  const [activeTab, setActiveTab] = useState("raw");

  const { data: cache, loading, error, source } = useViewData<CacheInstanceResponse>({
    endpoint: "cache",
    dataKey: "cache",
  });

  return (
    <ViewPageLayout loading={loading} error={error}>
      {cache && (
        <>
          <CacheCrumbs cache={cache} />
          {source && <Source source={source} />}
          <CachePreviewInfo cache={cache} />
          <ContentTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            data={{ cache, loading: false, error: null, source }}
          />
        </>
      )}
    </ViewPageLayout>
  );
}
