import { memo } from "react";
import { StatsCard } from "@/components/ui/cards/stats-card"
import { CountGraph } from "@/components/ui/graphs/count-graph"
import { DurationGraph } from "@/components/ui/graphs/duration-graph";
import { StatsGrid } from "@/components/ui/stats-grid"
import { useCountGraphData, useDurationGraphData } from "@/hooks/useGraphData";

const MAIL_BAR_DATA = [
  { 
    dataKey: "completed", 
    name: "COMPLETED",
    stackId: "a", 
    fill: document.documentElement.classList.contains("dark")
      ? "#242427"
      : "#f1f5f9" 
  },
  { 
    dataKey: "failed", 
    name: "FAILED",
    stackId: "b", 
    fill: "#ef4444" 
  },
];

// Memoized mail count card - fetches its own data
const CountCard = memo(() => {
  const { data } = useCountGraphData({ 
    key: "mails", 
  });

  if (!data) return null;

  return (
    <StatsCard
      title="MAILS"
      count={data.count}
      badges={[
        { label: "COMPLETED", value: data.indexCountOne, variant: "secondary" },
        { label: "FAILED", value: data.indexCountTwo, variant: "error" },
      ]}
      graph={
        <CountGraph
          data={data.countFormattedData}
          barData={MAIL_BAR_DATA}
        />
      }
    />
  );
});

CountCard.displayName = 'CountCard';

// Memoized duration card - fetches its own data
const DurationCard = memo(() => {
  const { data } = useDurationGraphData({ 
    key: "mails", 
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