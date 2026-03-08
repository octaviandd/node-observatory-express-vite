import { StatsCard } from "@/components/ui/cards/stats-card"
import { CountGraph } from "@/components/ui/graphs/count-graph"
import { StatsGrid } from "@/components/ui/stats-grid"
import { useExceptions } from "@/hooks/useApiTyped";

const EXCEPTION_BAR_DATA = [
  { dataKey: "unhandledRejection", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "uncaughtException", stackId: "b", fill: "#ffc658" },
];

export const Graphs = () => {
  const { data, isLoading, isError } = useExceptions.useGraph();

  if (isLoading) {
    return "Loading...";
  }

  if (!data) {
    return "Error";
  }

  return (
    <StatsGrid columns={1}>
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
    </StatsGrid>
  )
}