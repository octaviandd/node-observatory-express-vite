import { memo } from "react";
import { StatsCard } from "@/components/ui/cards/stats-card"
import { CountGraph } from "@/components/ui/graphs/count-graph"
import { StatsGrid } from "@/components/ui/stats-grid"
import { useCountGraphData } from "@/hooks/useGraphData";

const EXCEPTION_BAR_DATA = [
  { 
    dataKey: "unhandledRejection", 
    name: "UNHANDLED",
    stackId: "a", 
    fill: document.documentElement.classList.contains("dark")
      ? "#242427"
      : "#f1f5f9" 
  },
  { 
    dataKey: "uncaughtException", 
    name: "UNCAUGHT",
    stackId: "b", 
    fill: "#ffc658" 
  },
];

// Memoized exception count card - fetches its own data
const CountCard = memo(() => {
  const { data } = useCountGraphData({ 
    key: "exceptions", 
  });

  if (!data) return null;

  return (
    <StatsCard
      title="EXCEPTIONS"
      count={data.count}
      badges={[
        { label: "UNHANDLED", value: data.indexCountOne, variant: "secondary" },
        { label: "UNCAUGHT", value: data.indexCountTwo, variant: "warning" },
      ]}
      graph={
        <CountGraph
          data={data.countFormattedData}
          barData={EXCEPTION_BAR_DATA}
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