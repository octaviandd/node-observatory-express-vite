/** @format */

import JobsIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import {
  IndexPageLayout,
  StatsCard,
  DurationCard,
  StatsGrid,
} from "@/components/ui/index-page";
import { useJobs } from "@/hooks/useApiTyped";

const JOB_BAR_DATA = [
  { dataKey: "completed", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "released", stackId: "b", fill: "#ffc658" },
  { dataKey: "failed", stackId: "c", fill: "#ef4444" },
];

export default function JobsIndex() {
  const { data } = useJobs.useGraph();

  return (
    <IndexPageLayout>
      {data && (
        <StatsGrid columns={2}>
          <StatsCard
            title="JOB ATTEMPTS"
            count={data.count}
            badges={[
              { label: "COMPLETED", value: data.indexCountOne, variant: "secondary" },
              { label: "RELEASED", value: data.indexCountTwo, variant: "warning" },
              { label: "FAILED", value: data.indexCountThree, variant: "error" },
            ]}
            graph={
                <CountGraph
                  data={data.countFormattedData}
                  barData={JOB_BAR_DATA}
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
      <JobsIndexTable />
    </IndexPageLayout>
  );
}
