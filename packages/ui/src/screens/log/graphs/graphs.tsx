import { memo } from "react";
import { StatsCard } from "@/components/ui/cards/stats-card"
import { CountGraph } from "@/components/ui/graphs/count-graph"
import { StatsGrid } from "@/components/ui/stats-grid"
import { useCountGraphData } from "@/hooks/useGraphData";

const LOG_LEVELS = [
  { 
    dataKey: "info", 
    name: "INFO",
    variant: "secondary", 
    fill: document.documentElement.classList.contains("dark")
      ? "#242427"
      : "#F3F7FA" 
  },
  { 
    dataKey: "warn", 
    name: "WARN",
    variant: "warning", 
    fill: "#CA8A03" 
  },
  { 
    dataKey: "error", 
    name: "ERROR",
    variant: "error", 
    fill: "#DC2625" 
  },
  { 
    dataKey: "debug", 
    name: "DEBUG",
    variant: "debug", 
    fill: "#2463EB" 
  },
  { 
    dataKey: "trace", 
    name: "TRACE",
    variant: "trace", 
    fill: "#14B8A6" 
  },
  { 
    dataKey: "fatal", 
    name: "FATAL",
    variant: "error", 
    fill: "#DC2625" 
  },
  { 
    dataKey: "log", 
    name: "LOG",
    variant: "log", 
    fill: "#6A7280" 
  },
] as const;

// Memoized log count card - fetches its own data
const CountCard = memo(() => {
  const { data } = useCountGraphData({ 
    key: "logs", 
  });

  if (!data) return null;

  return (
    <StatsCard
      title="LOGS"
      count={data.count}
      badges={[
        { label: "INFO", value: data.indexCountOne, variant: "secondary" },
        { label: "WARN", value: data.indexCountTwo, variant: "warning" },
        { label: "ERROR", value: data.indexCountThree, variant: "destructive" },
        { label: "DEBUG", value: data.indexCountFour ?? "0", variant: "debug" },
        { label: "TRACE", value: data.indexCountFive ?? "0", variant: "trace" },
        { label: "FATAL", value: data.indexCountSix ?? "0", variant: "error" },
        { label: "LOG", value: data.indexCountSeven ?? "0", variant: "log" },
      ]}
      graph={
        <CountGraph
          data={data.countFormattedData}
          barData={LOG_LEVELS.map((level) => ({
            dataKey: level.dataKey,
            name: level.name,
            stackId: level.dataKey,
            fill: level.fill,
          }))}
        />
      }
    />
  );
});

CountCard.displayName = 'CountCard';

export const Graphs = () => {
  return (
    <StatsGrid columns={1}>
      <CountCard />
    </StatsGrid>
  );
};