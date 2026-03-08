/** @format */

import CacheIndexTable from "../table";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graph/graphs";
import { FilterProvider } from "@/hooks/useFilterContext";

export default function CacheIndex() {
  return (
    <FilterProvider defaultInstanceStatusType="all">
      <IndexLayout>
        <Graphs/>
        <CacheIndexTable />
      </IndexLayout>
    </FilterProvider>
  );
}
