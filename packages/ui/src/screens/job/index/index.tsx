/** @format */

import JobsIndexTable from "../table";
import { IndexLayout } from "@/components/ui/layout/index-layout";
import { Graphs } from "../graphs/graphs";

export default function JobsIndex() {
  return (
      <IndexLayout>
        <Graphs />
        <JobsIndexTable />
      </IndexLayout>
  );
}
