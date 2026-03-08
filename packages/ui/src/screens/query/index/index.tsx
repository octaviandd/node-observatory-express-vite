/** @format */

import QueryIndexTable from "../table";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graphs/graphs";
import { FilterProvider } from "@/hooks/useFilterContext";

export default function QueryIndex() {
  return (
    <FilterProvider defaultInstanceStatusType="all">
      <IndexLayout>
        <Graphs />
        <QueryIndexTable />
      </IndexLayout>
    </FilterProvider>
  );
}
