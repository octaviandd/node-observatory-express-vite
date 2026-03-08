/** @format */

import ModelIndexTable from "../table/index";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graphs/graphs";
import { FilterProvider } from "@/hooks/useFilterContext";


export default function ModelIndex() {
  return (
    <FilterProvider defaultInstanceStatusType="all">
       <IndexLayout>
        <Graphs />
        <ModelIndexTable />
      </IndexLayout>
    </FilterProvider>
  )
}
