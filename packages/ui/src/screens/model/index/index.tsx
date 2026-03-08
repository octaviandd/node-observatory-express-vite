/** @format */

import ModelIndexTable from "../table/index";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graphs/graphs";


export default function ModelIndex() {
  return (
    <IndexLayout>
      <Graphs />
      <ModelIndexTable />
    </IndexLayout>
  );
}
