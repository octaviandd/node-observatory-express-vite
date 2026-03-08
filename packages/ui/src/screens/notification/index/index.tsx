/** @format */

import { DurationCard } from "@/components/ui/cards/duration-card";
import { StatsCard } from "@/components/ui/cards/stats-card";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { StatsGrid } from "@/components/ui/stats-grid";
import NotificationsIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { useNotifications } from "@/hooks/useApiTyped";
import { StoreContext } from "@/store";
import { useContext } from "react";

const NOTIFICATION_BAR_DATA = [
  { dataKey: "completed", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "failed", stackId: "b", fill: "#ef4444" },
];

export default function NotificationsIndex() {
  const { state } = useContext(StoreContext);
  const { data } = useNotifications.useGraph();

  return (
    <IndexLayout>
      {data && (
        <StatsGrid columns={2}>
          <StatsCard
            title="NOTIFICATIONS"
            count={data.count}
            badges={[
              { label: "Completed", value: data.indexCountOne, variant: "secondary" },
              { label: "Failed", value: data.indexCountTwo, variant: "error" },
            ]}
            graph={
                <CountGraph
                  data={data.countFormattedData}
                  barData={NOTIFICATION_BAR_DATA}
                />
            }
          />
          <DurationCard
            shortest={data.shortest}
            longest={data.longest}
            average={data.average}
            p95={data.p95}
            durationFormattedData={data.durationFormattedData}
           />
        </StatsGrid>
      )}
      <NotificationsIndexTable />
    </IndexLayout>
  );
}
