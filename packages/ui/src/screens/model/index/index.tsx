/** @format */

import { DurationCard } from "@/components/ui/cards/duration-card";
import { StatsCard } from "@/components/ui/cards/stats-card";
import ModelIndexTable from "../table/index";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { StatsGrid } from "@/components/ui/stats-grid";
import { useTableData, TableDataContext } from "@/hooks/useTableData";

const MODEL_BAR_DATA = [
  { dataKey: "completed", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "failed", stackId: "b", fill: "#ef4444" },
];

export default function ModelIndex() {
  const tableData = useTableData({ key: "models", defaultInstanceStatusType: "all" });
  const { graphData } = tableData;

  return (
    <TableDataContext.Provider value={tableData}>
      <IndexLayout>
        {graphData && (
          <StatsGrid columns={2}>
            <StatsCard
              title="INSTANCES"
              count={graphData.count}
              badges={[
                { label: "COMPLETED", value: graphData.indexCountOne, variant: "secondary" },
                { label: "FAILED", value: graphData.indexCountTwo, variant: "destructive" },
              ]}
              graph={
                <CountGraph
                  data={graphData.countFormattedData}
                  barData={MODEL_BAR_DATA}
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
        <ModelIndexTable />
      </IndexLayout>
    </TableDataContext.Provider>
  );
}
