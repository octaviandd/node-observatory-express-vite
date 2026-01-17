/** @format */

import LogsIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { useGraph } from "@/hooks/useGraph";
import {
  IndexPageLayout,
  StatsCard,
  StatsGrid,
} from "@/components/ui/index-page";

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
  const { data, currentDate, period } = useGraph({
    type: "logs",
  });

  return (
    <IndexPageLayout>
      {data && (
        <StatsGrid columns={1}>
          <StatsCard
            title="LOGS"
            count={data.count}
            badges={[
              { label: "INFO", value: data.indexCountOne, variant: "secondary" },
              { label: "WARN", value: data.indexCountTwo, variant: "warning" },
              { label: "ERROR", value: data.indexCountThree, variant: "destructive" },
              { label: "DEBUG", value: data.indexCountFive ?? 0, variant: "debug" },
              { label: "TRACE", value: data.indexCountSix ?? 0, variant: "trace" },
              { label: "FATAL", value: data.indexCountSeven ?? 0, variant: "error" },
              { label: "LOG", value: data.indexCountEight ?? 0, variant: "log" },
            ]}
            graph={
              <CountGraph
                data={data.countFormattedData}
                barData={LOG_LEVELS.map((level) => ({
                  dataKey: level.dataKey,
                  stackId: level.dataKey,
                  fill: level.fill,
                }))}
                period={period}
                currentDate={currentDate}
              />
            }
          />
        </StatsGrid>
      )}
      <LogsIndexTable />
    </IndexPageLayout>
  );
}
