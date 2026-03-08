/** @format */

import LogsIndexTable from "../table";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graphs/graphs";

export default function LogsIndex() {
  return (
      <IndexLayout>
        <Graphs />
        <LogsIndexTable />
      </IndexLayout>
  );
}
