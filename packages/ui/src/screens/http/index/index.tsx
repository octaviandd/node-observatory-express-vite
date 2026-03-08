/** @format */

import HttpIndexTable from "../table";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graph/graphs";
import { FilterProvider } from "@/hooks/useFilterContext";

export default function HttpsIndex() {

  return (
    <FilterProvider defaultInstanceStatusType="all">
      <IndexLayout>
        <Graphs />
        <HttpIndexTable />
      </IndexLayout>
    </FilterProvider>
  );
}
