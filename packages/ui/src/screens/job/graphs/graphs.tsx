import { memo } from "react";
import { StatsCard } from "@/components/ui/cards/stats-card"
import { CountGraph } from "@/components/ui/graphs/count-graph"
import { DurationGraph } from "@/components/ui/graphs/duration-graph";
import { StatsGrid } from "@/components/ui/stats-grid"
import { useCountGraphData, useDurationGraphData } from "@/hooks/useGraphData";

const JOB_BAR_DATA = [
  { 
    dataKey: "completed", 
    name: "COMPLETED",
    stackId: "a", 
    fill: document.documentElement.classList.contains("dark")
      ? "#242427"
      : "#f1f5f9" 
  },
  { 
    dataKey: "released", 
    name: "RELEASED",
    stackId: "b", 
    fill: "#ffc658" 
  },
  { 
    dataKey: "failed", 
    name: "FAILED",
    stackId: "c", 
    fill: "#ef4444" 
  },
];

// Memoized job count card - fetches its own data
const CountCard = memo(() => {
  const { data } = useCountGraphData({ 
    key: "jobs", 
  });

  if (!data) return null;

  return (
    <StatsCard
      title="JOBS"
      count={data.count}
      badges={[
        { label: "COMPLETED", value: data.indexCountOne, variant: "secondary" },
        { label: "RELEASED", value: data.indexCountTwo, variant: "warning" },
        { label: "FAILED", value: data.indexCountThree, variant: "error" },
      ]}
      graph={
        <CountGraph
          data={data.countFormattedData}
          barData={JOB_BAR_DATA}
        />
      }
    />
  );
});

CountCard.displayName = 'CountCard';

// Memoized duration card - fetches its own data
const DurationCard = memo(() => {
  const { data } = useDurationGraphData({ 
    key: "jobs", 
  });

  if (!data) return null;

  return (
    <StatsCard
      title="DURATION"
      count={`${data.shortest} – ${data.longest}`}
      badges={[
        { label: "AVG", value: data.average, variant: "secondary" },
        { label: "P95", value: data.p95, variant: "warning" },
      ]}
      graph={
        <DurationGraph data={data.durationFormattedData} />
      }
    />
  );
});

DurationCard.displayName = 'DurationCard';

export const Graphs = () => {
  return (
    <StatsGrid columns={2}>
      <CountCard />
      <DurationCard />
    </StatsGrid>
  );
};