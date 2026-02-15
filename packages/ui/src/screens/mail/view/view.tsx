/** @format */

import { useState } from "react";
import MailCrumbs from "./crumbs";
import MailPreviewInfo from "./info";
import ContentTabs from "./tabs";
import {
  ViewPageLayout,
  useViewData,
  Source,
} from "@/components/ui/view-page";
import { MailInstanceResponse } from "@/hooks/useApiTyped";

export default function MailPreview() {
  const [activeTab, setActiveTab] = useState("raw");

  const { data: mail, loading, error, source } = useViewData<MailInstanceResponse>({
    endpoint: "mails",
    dataKey: "mail",
  });

  return (
    <ViewPageLayout loading={loading} error={error}>
      {mail && (
        <>
          <MailCrumbs mail={mail} />
          {source && <Source source={source} />}
          <MailPreviewInfo mail={mail} />
          <ContentTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            data={{ mail }}
          />
        </>
      )}
    </ViewPageLayout>
  );
}
