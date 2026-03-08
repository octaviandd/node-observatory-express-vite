/** @format */
import { IndexLayout } from "@/components/ui/layout/index-layout";
import NotificationsIndexTable from "../table";
import { Graphs } from "../graphs/graphs";
import { FilterProvider } from "@/hooks/useFilterContext";


export default function NotificationsIndex() {
  return (
    <FilterProvider defaultInstanceStatusType="all">
      <IndexLayout>
        <Graphs />
        <NotificationsIndexTable />
      </IndexLayout>
    </FilterProvider>
  );
}
