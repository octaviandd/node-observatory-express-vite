import { StatsCard } from "@/components/ui/cards/stats-card"
import { CountGraph } from "@/components/ui/graphs/count-graph"
import { DurationGraph } from "@/components/ui/graphs/duration-graph";
import { StatsGrid } from "@/components/ui/stats-grid"
import { useRequests } from "@/hooks/useApiTyped";

const NOTIFICATION_BAR_DATA = [
  { dataKey: "completed", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "failed", stackId: "b", fill: "#ef4444" },
];

export const Graphs = () => {
  const { data, isLoading, isError } = useRequests.useGraph();

  if (isLoading) {
    return "Loading...";
  }

  if (!data) {
    return "Error";
  }

  return (
    <StatsGrid columns={2}>
      <StatsCard
        title="NOTIFICATIONS"
        count={data.count}
        badges={[
              { label: "Completed", value: data.indexCountOne, variant: "secondary" },
              { label: "Failed", value: data.indexCountTwo, variant: "error" },
            ]}
        graph={
          <CountGraph
            data={data.countFormattedData}
            barData={NOTIFICATION_BAR_DATA}
          />
        }
      />

      <StatsCard
        title="DURATION"
        count={data.count}
        badges={[
              { label: "Completed", value: data.indexCountOne, variant: "secondary" },
              { label: "Failed", value: data.indexCountTwo, variant: "error" },
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