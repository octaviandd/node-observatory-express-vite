/** @format */

import QueryIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import {
  IndexPageLayout,
  StatsCard,
  DurationCard,
  StatsGrid,
} from "@/components/ui/index-page";
import { useQueries } from "@/hooks/useApiTyped";
import { StoreContext } from "@/store";
import { useContext } from "react";

const QUERY_BAR_DATA = [
  { dataKey: "completed", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "failed", stackId: "b", fill: "#ef4444" },
];

export default function QueryIndex() {
  const { state } = useContext(StoreContext);
  const { data } = useQueries.useGraph();

  return (
    <IndexPageLayout>
      {data && (
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
      <QueryIndexTable />
    </IndexPageLayout>
  );
}
