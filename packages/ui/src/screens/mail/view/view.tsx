/** @format */

import { useState } from "react";
import MailCrumbs from "./crumbs";
import { Details } from "./details";
import ContentTabs from "./tabs";
import { MailInstanceResponse } from "@/hooks/useApiTyped";
import { ViewLayout } from "@/components/ui/layout/view-layout";
import { useViewData } from "@/hooks/useViewData";
import Source from "./source";

export default function MailPreview() {
  const [activeTab, setActiveTab] = useState("raw");

  const { data: mail, loading, error, source } = useViewData<MailInstanceResponse>({
    endpoint: "mails",
    dataKey: "mail",
  });

  return (
    <ViewLayout loading={loading} error={error}>
      {mail && (
        <>
          <MailCrumbs mail={mail} />
          {source && <Source source={source} />}
          <Details mail={mail} />
          <ContentTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            data={{ mail }}
          />
        </>
      )}
    </ViewLayout>
  );
}
