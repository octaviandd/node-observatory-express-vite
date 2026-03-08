/** @format */

import QueryIndexTable from "../table";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graphs/graphs";


export default function QueryIndex() {

  return (
    <IndexLayout>
      <Graphs />
      <QueryIndexTable />
    </IndexLayout>
  );
}
