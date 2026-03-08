import { StatsCard } from "@/components/ui/cards/stats-card"
import { CountGraph } from "@/components/ui/graphs/count-graph"
import { DurationGraph } from "@/components/ui/graphs/duration-graph";
import { StatsGrid } from "@/components/ui/stats-grid"
import { useHttps } from "@/hooks/useApiTyped";

const REQUEST_BAR_DATA = [
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

export const Graphs = () => {
  const { data, isLoading, isError } = useHttps.useGraph();

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
          { label: "1/2/3XX", value: data.indexCountOne, variant: "secondary" },
          { label: "4XX", value: data.indexCountTwo, variant: "warning" },
          { label: "5XX", value: data.indexCountThree, variant: "error" },
        ]}
        graph={
          <CountGraph
            data={data.countFormattedData}
            barData={REQUEST_BAR_DATA}
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