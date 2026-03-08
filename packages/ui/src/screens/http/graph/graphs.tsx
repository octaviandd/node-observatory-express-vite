import { memo } from "react";
import { StatsCard } from "@/components/ui/cards/stats-card"
import { CountGraph } from "@/components/ui/graphs/count-graph"
import { DurationGraph } from "@/components/ui/graphs/duration-graph";
import { StatsGrid } from "@/components/ui/stats-grid"
import { useCountGraphData, useDurationGraphData } from "@/hooks/useGraphData";

const HTTP_BAR_DATA = [
  {
    dataKey: "count_200",
    name: "1/2/3XX",
    stackId: "a",
    fill: document.documentElement.classList.contains("dark")
      ? "#242427"
      : "#f1f5f9",
  },
  { dataKey: "count_400", name: "4XX", stackId: "b", fill: "#ffc658" },
  { dataKey: "count_500", name: "5XX", stackId: "c", fill: "#ef4444" },
];

// Memoized HTTP count card - fetches its own data
const CountCard = memo(() => {
  const { data } = useCountGraphData({ 
    key: "https", 
  });

  if (!data) return null;

  return (
    <StatsCard
      title="HTTP REQUESTS"
      count={data.count}
      badges={[
        { label: "1/2/3XX", value: data.indexCountOne, variant: "secondary" },
        { label: "4XX", value: data.indexCountTwo, variant: "warning" },
        { label: "5XX", value: data.indexCountThree, variant: "error" },
      ]}
      graph={
        <CountGraph
          data={data.countFormattedData}
          barData={HTTP_BAR_DATA}
        />
      }
    />
  );
});

CountCard.displayName = 'CountCard';

// Memoized duration card - fetches its own data
const DurationCard = memo(() => {
  const { data } = useDurationGraphData({ 
    key: "https", 
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