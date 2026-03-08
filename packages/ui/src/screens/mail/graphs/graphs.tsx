import { StatsCard } from "@/components/ui/cards/stats-card"
import { CountGraph } from "@/components/ui/graphs/count-graph"
import { DurationGraph } from "@/components/ui/graphs/duration-graph";
import { StatsGrid } from "@/components/ui/stats-grid"
import { useMails } from "@/hooks/useApiTyped";

const MAIL_BAR_DATA = [
  { dataKey: "completed", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "failed", stackId: "b", fill: "#ef4444" },
];

export const Graphs = () => {
  const { data, isLoading, isError } = useMails.useGraph();

  if (isLoading) {
    return "Loading...";
  }

  if (!data) {
    return "Error";
  }

  return (
    <StatsGrid columns={2}>
      <StatsCard
        title="REQUESTS"
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

      <StatsCard
        title="DURATION"
        count={data.count}
        badges={[
          { label: "1/2/3XX", value: data.indexCountOne, variant: "secondary" },
          { label: "4XX", value: data.indexCountTwo, variant: "warning" },
          { label: "5XX", value: data.indexCountThree, variant: "error" },
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