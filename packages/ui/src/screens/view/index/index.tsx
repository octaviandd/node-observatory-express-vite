/** @format */

import { FilterProvider } from "@/hooks/useFilterContext";
import ViewsIndexTable from "../table/index";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graphs/graphs";

export default function ViewsIndex() {

  return (
      <FilterProvider defaultInstanceStatusType="all">
        <IndexLayout>
          <Graphs />
          <ViewsIndexTable /> 
        </IndexLayout>
      </FilterProvider>
  );
}
