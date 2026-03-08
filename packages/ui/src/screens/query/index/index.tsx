/** @format */

import { DurationCard } from "@/components/ui/cards/duration-card";
import { StatsCard } from "@/components/ui/cards/stats-card";
import QueryIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { StatsGrid } from "@/components/ui/stats-grid";
import { useTableData, TableDataContext } from "@/hooks/useTableData";

const QUERY_BAR_DATA = [
  { dataKey: "COMPLETED", stackId: "a", fill: document.documentElement.classList.contains("dark")
    ? "#242427"
    : "#f1f5f9" },
  { dataKey: "FAILED", stackId: "b", fill: "#ef4444" },
];

export default function QueryIndex() {
  const tableData = useTableData({ key: "queries", defaultInstanceStatusType: "all" });
  const { graphData } = tableData;

  return (
    <TableDataContext.Provider value={tableData}>
      <IndexLayout>
        {graphData && (
          <StatsGrid columns={2}>
            <StatsCard
              title="QUERIES"
              count={graphData.count}
              badges={[
                { label: "COMPLETED", value: graphData.indexCountOne, variant: "secondary" },
                { label: "FAILED", value: graphData.indexCountTwo, variant: "destructive" },
              ]}
              graph={
                <CountGraph
                  data={graphData.countFormattedData}
                  barData={QUERY_BAR_DATA}
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
        <QueryIndexTable />
      </IndexLayout>
    </TableDataContext.Provider>
  );
}
