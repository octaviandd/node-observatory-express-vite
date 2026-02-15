/** @format */

import ModelIndexTable from "../table/index";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import {
  IndexPageLayout,
  StatsCard,
  DurationCard,
  StatsGrid,
} from "@/components/ui/index-page";
import { useModels } from "@/hooks/useApiTyped";
import { StoreContext } from "@/store";
import { useContext } from "react";

const MODEL_BAR_DATA = [
  { dataKey: "completed", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "failed", stackId: "b", fill: "#ef4444" },
];

export default function ModelIndex() {
  const { state } = useContext(StoreContext);
  const { data } = useModels.useGraph();

  return (
    <IndexPageLayout>
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
            period={state.period}
            currentDate={""}
          />
        </StatsGrid>
      )}
      <ModelIndexTable />
    </IndexPageLayout>
  );
}
