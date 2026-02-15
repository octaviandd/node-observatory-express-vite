/** @format */

import { useState } from "react";
import { ModelCrumbs } from "./crumbs";
import ContentTabs from "./tabs";
import Details from "./details";
import {
  ViewPageLayout,
  useViewData,
  Source,
} from "@/components/ui/view-page";
import { ModelInstanceResponse } from "@/hooks/useApiTyped";

export default function ModelPreview() {
  const [activeTab, setActiveTab] = useState("raw");

  const { data: model, loading, error, source } = useViewData<ModelInstanceResponse>({
    endpoint: "models",
    dataKey: "model",
  });

  return (
    <ViewPageLayout loading={loading} error={error}>
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
    </ViewPageLayout>
  );
}
