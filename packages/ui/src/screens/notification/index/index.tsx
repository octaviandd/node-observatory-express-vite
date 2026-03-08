/** @format */
import { IndexLayout } from "@/components/ui/layout/index-layout";
import NotificationsIndexTable from "../table";
import { Graphs } from "../graphs/graphs";


export default function NotificationsIndex() {
  return (
    <IndexLayout>
      <Graphs />
      <NotificationsIndexTable />
    </IndexLayout>
  );
}
