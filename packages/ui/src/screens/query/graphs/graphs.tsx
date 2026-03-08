import { StatsCard } from "@/components/ui/cards/stats-card"
import { CountGraph } from "@/components/ui/graphs/count-graph"
import { DurationGraph } from "@/components/ui/graphs/duration-graph";
import { StatsGrid } from "@/components/ui/stats-grid"
import { useQueries } from "@/hooks/useApiTyped";

const QUERY_BAR_DATA = [
  { dataKey: "COMPLETED", stackId: "a", fill: document.documentElement.classList.contains("dark")
    ? "#242427"
    : "#f1f5f9" },
  { dataKey: "FAILED", stackId: "b", fill: "#ef4444" },
];


export const Graphs = () => {
  const { data, isLoading, isError } = useQueries.useGraph();

  if (isLoading) {
    return "Loading...";
  }

  if (!data) {
    return "Error";
  }

  return (
    <StatsGrid columns={2}>
      <StatsCard
        title="QUERIES"
        count={data.count}
        badges={[
              { label: "COMPLETED", value: data.indexCountOne, variant: "secondary" },
              { label: "FAILED", value: data.indexCountTwo, variant: "destructive" },
            ]}
        graph={
          <CountGraph
            data={data.countFormattedData}
            barData={QUERY_BAR_DATA}
          />
        }
      />

      <StatsCard
        title="DURATION"
        count={data.count}
        badges={[
              { label: "COMPLETED", value: data.indexCountOne, variant: "secondary" },
              { label: "FAILED", value: data.indexCountTwo, variant: "destructive" },
            ]}
        graph={
          <DurationGraph
            data={data.durationFormattedData}
          />
        }
      />
    </StatsGrid>
  )
}