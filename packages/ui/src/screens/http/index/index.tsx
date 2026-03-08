/** @format */

import { DurationCard } from "@/components/ui/cards/duration-card";
import { StatsCard } from "@/components/ui/cards/stats-card";
import HttpIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { StatsGrid } from "@/components/ui/stats-grid";
import { useHttps } from "@/hooks/useApiTyped";

const HTTP_BAR_DATA = [
  { dataKey: "count_200", name: "2XX", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "count_400", name: "4XX", stackId: "b", fill: "#ffc658" },
  { dataKey: "count_500", name: "5XX", stackId: "c", fill: "#ef4444" },
];

export default function HttpsIndex() {
  const { data } = useHttps.useGraph();

   return (
    <IndexLayout>
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
          />
        </StatsGrid>
      )}
      <HttpIndexTable />
    </IndexLayout>
  );
}
