/** @format */

import LogsIndexTable from "../table";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graphs/graphs";
import { FilterProvider } from "@/hooks/useFilterContext";

export default function LogsIndex() {
  return (
    <FilterProvider defaultInstanceStatusType="all">
       <IndexLayout>
        <Graphs />
        <LogsIndexTable />
      </IndexLayout>
    </FilterProvider>
  );
}
