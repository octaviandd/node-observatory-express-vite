/** @format */

import { useState } from "react";
import { ExceptionCrumbs } from "./crumbs";
import { Details } from "./details";
import ContentTabs from "./tabs";
import { ExceptionInstanceResponse } from "@/hooks/useApiTyped";
import { ViewLayout } from "@/components/ui/layout/view-layout";
import Source from "./source";
import { useViewData } from "@/hooks/useViewData";

export default function ExceptionView() {
  const [activeTab, setActiveTab] = useState("raw");

  const { data: exception, loading, error, source } = useViewData<ExceptionInstanceResponse>({
    endpoint: "exceptions",
    dataKey: "exception",
  });

  return (
    <ViewLayout loading={loading} error={error}>
      {exception && (
        <>
          <ExceptionCrumbs exception={exception} />
          {source && <Source source={source} />}
          <Details exception={exception} />
          <ContentTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            data={{ exception }}
          />
        </>
      )}
    </ViewLayout>
  );
}
