/** @format */

import CacheIndexTable from "../table";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graph/graphs";

export default function CacheIndex() {
  return (
    <IndexLayout>
      <Graphs/>
      <CacheIndexTable />
    </IndexLayout>
  );
}
