/** @format */

import HttpIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import {
  IndexPageLayout,
  StatsCard,
  DurationCard,
  StatsGrid,
} from "@/components/ui/index-page";
import { useHttps } from "@/hooks/useApiTyped";
import { StoreContext } from "@/store";
import { useContext } from "react";

const HTTP_BAR_DATA = [
  { dataKey: "200", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "400", stackId: "b", fill: "#ffc658" },
  { dataKey: "500", stackId: "c", fill: "#ef4444" },
];

export default function HttpsIndex() {
  const { state } = useContext(StoreContext);
  const { data } = useHttps.useGraph();

   return (
    <IndexPageLayout>
      {data && (
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
                  barData={HTTP_BAR_DATA}
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
      <HttpIndexTable />
    </IndexPageLayout>
  );
}
