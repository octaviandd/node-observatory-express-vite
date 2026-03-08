/** @format */
import RequestIndexTable from "../table/index";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graph/graphs";
import { FilterProvider } from "@/hooks/useFilterContext";

export default function RequestsIndex() {
  return (
    <FilterProvider defaultInstanceStatusType="all">
      <IndexLayout>
        <Graphs/>
        <RequestIndexTable />
      </IndexLayout>
    </FilterProvider>
  );
}
