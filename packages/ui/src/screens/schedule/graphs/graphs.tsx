/** @format */

import { memo } from "react";
import { StatsCard } from "@/components/ui/cards/stats-card";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { DurationGraph } from "@/components/ui/graphs/duration-graph";
import { StatsGrid } from "@/components/ui/stats-grid";
import { useCountGraphData, useDurationGraphData } from "@/hooks/useGraphData";

const SCHEDULE_BAR_DATA = [
  {
    dataKey: "completed",
    name: "Completed",
    stackId: "a",
    fill: document.documentElement.classList.contains("dark")
      ? "#242427"
      : "#f1f5f9",
  },
  { dataKey: "failed", name: "Failed", stackId: "b", fill: "#ef4444" },
];

// Memoized schedule count card - fetches its own data
const CountCard = memo(() => {
  const { data } = useCountGraphData({
    key: "schedules",
  });

  if (!data) return null;

  return (
    <StatsCard
      title="RUNS"
      count={data.count}
      badges={[
        { label: "Completed", value: data.indexCountOne, variant: "secondary" },
        { label: "Failed", value: data.indexCountTwo, variant: "error" },
      ]}
      graph={
        <CountGraph
          data={data.countFormattedData}
          barData={SCHEDULE_BAR_DATA}
        />
      }
    />
  );
});

// Memoized duration card - fetches its own data
const DurationCard = memo(() => {
  const { data } = useDurationGraphData({
    key: "schedules", // ← Fixed from "requests"
  });

  if (!data) return null;

  return (
    <StatsCard
      title="DURATION"
      count={`${data.shortest} – ${data.longest}`}
      badges={[
        { label: "AVG", value: data.average, variant: "secondary" },
        { label: "P95", value: data.p95, variant: "warning" },
      ]}
      graph={<DurationGraph data={data.durationFormattedData} />}
    />
  );
});

export const Graphs = () => {
  return (
    <StatsGrid columns={2}>
      <CountCard />
      <DurationCard />
    </StatsGrid>
  );
};
