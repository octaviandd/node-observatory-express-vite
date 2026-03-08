/** @format */

import { StatsCard } from "@/components/ui/cards/stats-card";
import LogsIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { StatsGrid } from "@/components/ui/stats-grid";
import { useTableData, TableDataContext } from "@/hooks/useTableData";

const LOG_LEVELS = [
  { dataKey: "info", variant: "secondary", fill: "#F3F7FA" },
  { dataKey: "warn", variant: "warning", fill: "#CA8A03" },
  { dataKey: "error", variant: "error", fill: "#DC2625" },
  { dataKey: "debug", variant: "debug", fill: "#2463EB" },
  { dataKey: "trace", variant: "trace", fill: "#14B8A6" },
  { dataKey: "fatal", variant: "error", fill: "#DC2625" },
  { dataKey: "log", variant: "log", fill: "#6A7280" },
] as const;

export default function LogsIndex() {
  const tableData = useTableData({ key: "logs", defaultInstanceStatusType: "all" });
  const { graphData } = tableData;

  return (
    <TableDataContext.Provider value={tableData}>
      <IndexLayout>
        {graphData && (
          <StatsGrid columns={1}>
            <StatsCard
              title="LOGS"
              count={graphData.count}
              badges={[
                { label: "INFO", value: graphData.indexCountOne, variant: "secondary" },
                { label: "WARN", value: graphData.indexCountTwo, variant: "warning" },
                { label: "ERROR", value: graphData.indexCountThree, variant: "destructive" },
                { label: "DEBUG", value: graphData.indexCountFive ?? 0, variant: "debug" },
                { label: "TRACE", value: graphData.indexCountSix ?? 0, variant: "trace" },
                { label: "FATAL", value: graphData.indexCountSeven ?? 0, variant: "error" },
                { label: "LOG", value: graphData.indexCountEight ?? 0, variant: "log" },
              ]}
              graph={
                <CountGraph
                  data={graphData.countFormattedData}
                  barData={LOG_LEVELS.map((level) => ({
                    dataKey: level.dataKey,
                    stackId: level.dataKey,
                    fill: level.fill,
                  }))}
                />
              }
            />
          </StatsGrid>
        )}
        <LogsIndexTable />
      </IndexLayout>
    </TableDataContext.Provider>
  );
}
