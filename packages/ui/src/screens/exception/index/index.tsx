/** @format */

import { StatsCard } from "@/components/ui/cards/stats-card";
import ExceptionsIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { StatsGrid } from "@/components/ui/stats-grid";
import { useTableData, TableDataContext } from "@/hooks/useTableData";

const EXCEPTION_BAR_DATA = [
  { dataKey: "unhandledRejection", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "uncaughtException", stackId: "b", fill: "#ffc658" },
];

export default function ExceptionsIndex() {
  const tableData = useTableData({ key: "exceptions", defaultInstanceStatusType: "all" });
  const { graphData } = tableData;

  return (
    <TableDataContext.Provider value={tableData}>
      <IndexLayout>
        {graphData && (
          <StatsGrid columns={1}>
            <StatsCard
              title="EXCEPTIONS"
              count={graphData.count}
              badges={[
                { label: "UNHANDLED", value: graphData.indexCountOne, variant: "secondary" },
                { label: "UNCAUGHT", value: graphData.indexCountTwo, variant: "warning" },
              ]}
              graph={
                <CountGraph
                  data={graphData.countFormattedData}
                  barData={EXCEPTION_BAR_DATA}
                />
              }
            />
          </StatsGrid>
        )}
        <ExceptionsIndexTable />
      </IndexLayout>
    </TableDataContext.Provider>
  );
}
