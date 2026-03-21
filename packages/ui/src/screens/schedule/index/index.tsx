/** @format */

import { IndexLayout } from "@/components/ui/layout/index-layout";
import { FilterProvider } from "@/hooks/useFilterContext";
import SchedulesIndexTable from "../table";
import { Graphs } from "../graphs/graphs";

export default function SchedulesIndex() {
  return (
    <FilterProvider defaultInstanceStatusType="all">
      <IndexLayout>
        <Graphs />
        <SchedulesIndexTable />
      </IndexLayout>
    </FilterProvider>
  );
}
