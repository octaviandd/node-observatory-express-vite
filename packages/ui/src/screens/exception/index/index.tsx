/** @format */

import ExceptionsIndexTable from "../table";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graph/graphs";

export default function ExceptionsIndex() {
  return (
      <IndexLayout>
        <Graphs />
        <ExceptionsIndexTable />
      </IndexLayout>
  );
}
