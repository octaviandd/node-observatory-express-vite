/** @format */

import ExceptionsIndexTable from "../table";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graph/graphs";
import { FilterProvider } from "@/hooks/useFilterContext";

export default function ExceptionsIndex() {
  return (
    <FilterProvider defaultInstanceStatusType="all">
      <IndexLayout>
        <Graphs />
        <ExceptionsIndexTable />
      </IndexLayout>
    </FilterProvider>
  );
}
