/** @format */

import CacheIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { StatsCard } from "@/components/ui/cards/stats-card";
import { DurationCard } from "@/components/ui/cards/duration-card";
import { StatsGrid } from "@/components/ui/stats-grid";
import { useTableData, TableDataContext } from "@/hooks/useTableData";

const CACHE_BAR_DATA = [
  { dataKey: "hits", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "writes", stackId: "b", fill: "#eab308" },
  { dataKey: "misses", stackId: "c", fill: "#ef4444" },
];

export default function CacheIndex() {
  const tableData = useTableData({ key: "cache", defaultInstanceStatusType: "all" });
  const { graphData } = tableData;

  return (
    <TableDataContext.Provider value={tableData}>
      <IndexLayout>
        {graphData && (
          <StatsGrid columns={2}>
            <StatsCard
              title="TRANSACTIONS"
              count={graphData.count}
              badges={[
                { label: "HITS", value: graphData.indexCountOne, variant: "secondary" },
                { label: "WRITES", value: graphData.indexCountTwo, variant: "warning" },
                { label: "MISSES", value: graphData.indexCountThree, variant: "error" },
              ]}
              graph={
                <CountGraph
                  data={graphData.countFormattedData}
                  barData={CACHE_BAR_DATA}
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
        <CacheIndexTable />
      </IndexLayout>
    </TableDataContext.Provider>
  );
}
