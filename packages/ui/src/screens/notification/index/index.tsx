/** @format */

import { DurationCard } from "@/components/ui/cards/duration-card";
import { StatsCard } from "@/components/ui/cards/stats-card";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { StatsGrid } from "@/components/ui/stats-grid";
import NotificationsIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { useTableData, TableDataContext } from "@/hooks/useTableData";

const NOTIFICATION_BAR_DATA = [
  { dataKey: "completed", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "failed", stackId: "b", fill: "#ef4444" },
];

export default function NotificationsIndex() {
  const tableData = useTableData({ key: "notifications", defaultInstanceStatusType: "all" });
  const { graphData } = tableData;

  return (
    <TableDataContext.Provider value={tableData}>
      <IndexLayout>
        {graphData && (
          <StatsGrid columns={2}>
            <StatsCard
              title="NOTIFICATIONS"
              count={graphData.count}
              badges={[
                { label: "Completed", value: graphData.indexCountOne, variant: "secondary" },
                { label: "Failed", value: graphData.indexCountTwo, variant: "error" },
              ]}
              graph={
                <CountGraph
                  data={graphData.countFormattedData}
                  barData={NOTIFICATION_BAR_DATA}
                />
              }
            />
            <DurationCard
              shortest={graphData.shortest}
              longest={graphData.longest}
              average={graphData.average}
              p95={graphData.p95}
              durationFormattedData={graphData.durationFormattedData}
            />
          </StatsGrid>
        )}
        <NotificationsIndexTable />
      </IndexLayout>
    </TableDataContext.Provider>
  );
}
