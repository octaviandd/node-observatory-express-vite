/** @format */

import CacheIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { StatsCard } from "@/components/ui/cards/stats-card";
import { DurationCard } from "@/components/ui/cards/duration-card";
import { StatsGrid } from "@/components/ui/stats-grid";
import { useCaches } from "@/hooks/useApiTyped";

const CACHE_BAR_DATA = [
  { dataKey: "hits", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "writes", stackId: "b", fill: "#eab308" },
  { dataKey: "misses", stackId: "c", fill: "#ef4444" },
];

export default function CacheIndex() {
  const { isLoading, data } = useCaches.useGraph({});

   if (isLoading || !data) return null;

  return (
    <IndexLayout>
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
      <CacheIndexTable />
    </IndexLayout>
  );
}
