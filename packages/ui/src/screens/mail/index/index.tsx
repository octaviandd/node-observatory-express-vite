/** @format */
import MailsIndexTable from "../table";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graphs/graphs";

export default function MailsIndex() {

  return (
    <IndexLayout>
      <Graphs />
      <MailsIndexTable />
    </IndexLayout>
  );
}
