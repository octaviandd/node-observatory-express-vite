/** @format */

import { DurationCard } from "@/components/ui/cards/duration-card";
import { StatsCard } from "@/components/ui/cards/stats-card";
import HttpIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { StatsGrid } from "@/components/ui/stats-grid";
import { useTableData, TableDataContext } from "@/hooks/useTableData";

const HTTP_BAR_DATA = [
  { dataKey: "count_200", name: "2XX", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "count_400", name: "4XX", stackId: "b", fill: "#ffc658" },
  { dataKey: "count_500", name: "5XX", stackId: "c", fill: "#ef4444" },
];

export default function HttpsIndex() {
  const tableData = useTableData({ key: "https", defaultInstanceStatusType: "all" });
  const { graphData } = tableData;

  return (
    <TableDataContext.Provider value={tableData}>
      <IndexLayout>
        {graphData && (
          <StatsGrid columns={2}>
            <StatsCard
              title="REQUESTS"
              count={graphData.count}
              badges={[
                { label: "1/2/3XX", value: graphData.indexCountOne, variant: "secondary" },
                { label: "4XX", value: graphData.indexCountTwo, variant: "warning" },
                { label: "5XX", value: graphData.indexCountThree, variant: "error" },
              ]}
              graph={
                <CountGraph
                  data={graphData.countFormattedData}
                  barData={HTTP_BAR_DATA}
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
        <HttpIndexTable />
      </IndexLayout>
    </TableDataContext.Provider>
  );
}
