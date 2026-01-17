/** @format */

import { useState } from "react";
import { ExceptionCrumbs } from "./crumbs";
import { ExceptionInfo } from "./info";
import ContentTabs from "./tabs";
import { ExceptionInstanceResponse } from "../../../../types";
import {
  ViewPageLayout,
  useViewData,
  Source,
} from "@/components/ui/view-page";

export default function ExceptionView() {
  const [activeTab, setActiveTab] = useState("raw");

  const { data: exception, loading, error, source } = useViewData<ExceptionInstanceResponse>({
    endpoint: "exceptions",
    dataKey: "exception",
  });

  return (
    <ViewPageLayout loading={loading} error={error}>
      {exception && (
        <>
          <ExceptionCrumbs exception={exception} />
          {source && <Source source={source} />}
          <ExceptionInfo exception={exception} />
          <ContentTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            data={{ exception, source, loading: false, error: null }}
          />
        </>
      )}
    </ViewPageLayout>
  );
}
