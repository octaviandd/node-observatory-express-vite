/** @format */

import { DurationCard } from "@/components/ui/cards/duration-card";
import { StatsCard } from "@/components/ui/cards/stats-card";
import QueryIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { StatsGrid } from "@/components/ui/stats-grid";
import { useQueries } from "@/hooks/useApiTyped";
import { useSearchParams } from "react-router";

const QUERY_BAR_DATA = [
  { dataKey: "COMPLETED", stackId: "a", fill: document.documentElement.classList.contains("dark")
    ? "#242427"
    : "#f1f5f9" },
  { dataKey: "FAILED", stackId: "b", fill: "#ef4444" },
];

export default function QueryIndex() {
  const [searchParams] = useSearchParams();

  const period = searchParams.get("period") as any;
  const status = searchParams.get("status") || undefined;
  const q = searchParams.get("q") || undefined;
  const key = searchParams.get("key") || undefined;

  const { data } = useQueries.useGraph({
    period,
    status,
    q,
    key,
  });

  return (
    <IndexLayout>
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
          />
        </StatsGrid>
      )}
      <QueryIndexTable />
    </IndexLayout>
  );
}
