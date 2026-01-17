/** @format */

import CacheIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { useGraph } from "@/hooks/useGraph";
import {
  IndexPageLayout,
  StatsCard,
  DurationCard,
  StatsGrid,
} from "@/components/ui/index-page";

const CACHE_BAR_DATA = [
  { dataKey: "hits", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "writes", stackId: "b", fill: "#eab308" },
  { dataKey: "misses", stackId: "c", fill: "#ef4444" },
];

export default function CacheIndex() {
  const { data, currentDate, period } = useGraph({
    type: "cache",
  });

  return (
    <IndexPageLayout>
      {data && (
        <StatsGrid columns={2}>
          <StatsCard
            title="TRANSACTIONS"
            count={data.count}
            badges={[
              { label: "HITS", value: data.indexCountOne, variant: "secondary" },
              { label: "WRITES", value: data.indexCountTwo, variant: "warning" },
              { label: "MISSES", value: data.indexCountThree, variant: "error" },
            ]}
            graph={
              <CountGraph
                data={data.countFormattedData}
                barData={CACHE_BAR_DATA}
                period={period}
                currentDate={currentDate}
              />
            }
          />
          <DurationCard
            shortest={data.shortest}
            longest={data.longest}
            average={data.average}
            p95={data.p95}
            durationFormattedData={data.durationFormattedData}
            period={period}
            currentDate={currentDate}
          />
        </StatsGrid>
      )}
      <CacheIndexTable />
    </IndexPageLayout>
  );
}
