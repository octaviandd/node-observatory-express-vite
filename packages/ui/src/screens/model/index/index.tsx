/** @format */

import { DurationCard } from "@/components/ui/cards/duration-card";
import { StatsCard } from "@/components/ui/cards/stats-card";
import ModelIndexTable from "../table/index";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { StatsGrid } from "@/components/ui/stats-grid";
import { useModels } from "@/hooks/useApiTyped";

const MODEL_BAR_DATA = [
  { dataKey: "completed", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "failed", stackId: "b", fill: "#ef4444" },
];

export default function ModelIndex() {
  const { data } = useModels.useGraph();

  return (
    <IndexLayout>
      {data && (
        <StatsGrid columns={2}>
          <StatsCard
            title="INSTANCES"
            count={data.count}
            badges={[
              { label: "COMPLETED", value: data.indexCountOne, variant: "secondary" },
              { label: "FAILED", value: data.indexCountTwo, variant: "destructive" },
            ]}
            graph={
              <CountGraph
                data={data.countFormattedData}
                barData={MODEL_BAR_DATA}
              />
            }
          />
          <DurationCard
            shortest={data.shortest}
            longest={data.longest}
            average={data.average}
            p95={data.p95}
            durationFormattedData={data.durationFormattedData}
          />
        </StatsGrid>
      )}
      <ModelIndexTable />
    </IndexLayout>
  );
}
