/** @format */

import { useState } from "react";
import { ModelCrumbs } from "./crumbs";
import ContentTabs from "./tabs";
import { Details } from "./details";
import { ModelInstanceResponse } from "@/hooks/useApiTyped";
import { ViewLayout } from "@/components/ui/layout/view-layout";
import { useViewData } from "@/hooks/useViewData";
import Source from "./source";

export default function ModelPreview() {
  const [activeTab, setActiveTab] = useState("raw");

  const { data: model, loading, error, source } = useViewData<ModelInstanceResponse>({
    endpoint: "models",
    dataKey: "model",
  });

  return (
    <ViewLayout loading={loading} error={error}>
      {model && (
        <>
          <ModelCrumbs model={model} />
          {source && <Source source={source} />}
          <Details model={model} />
          <ContentTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            data={{ model }}
          />
        </>
      )}
    </ViewLayout>
  );
}
