/** @format */

import HttpIndexTable from "../table";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graph/graphs";

export default function HttpsIndex() {

  return (
      <IndexLayout>
        <Graphs />
        <HttpIndexTable />
      </IndexLayout>
  );
}
