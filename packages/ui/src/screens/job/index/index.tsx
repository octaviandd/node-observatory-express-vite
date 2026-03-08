/** @format */

import JobsIndexTable from "../table";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graphs/graphs";
import { FilterProvider } from "@/hooks/useFilterContext";

export default function JobsIndex() {
  return (
    <FilterProvider defaultInstanceStatusType="all">
      <IndexLayout>
        <Graphs />
        <JobsIndexTable />
      </IndexLayout>
    </FilterProvider>
  );
}
