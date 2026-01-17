/** @format */

import NotificationsIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { useGraph } from "@/hooks/useGraph";
import {
  IndexPageLayout,
  StatsCard,
  DurationCard,
  StatsGrid,
} from "@/components/ui/index-page";

const NOTIFICATION_BAR_DATA = [
  { dataKey: "completed", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "failed", stackId: "b", fill: "#ef4444" },
];

export default function NotificationsIndex() {
  const { data, currentDate, period } = useGraph({
    type: "notifications",
  });

  return (
    <IndexPageLayout>
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
                  period={period}
                  currentDate={currentDate}
                />
            }
          />
          <DurationCard
            shortest={data.shortest}
            longest={data.longest}
            average={data.average}
            p95={data.p95}
            durationFormattedData={data.durationFormattedData}
                  period={period}
                  currentDate={currentDate}
                />
        </StatsGrid>
      )}
      <NotificationsIndexTable />
    </IndexPageLayout>
  );
}
