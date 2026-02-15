/** @format */

import ExceptionsIndexTable from "../table";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import {
  IndexPageLayout,
  StatsCard,
  StatsGrid,
} from "@/components/ui/index-page";
import { useExceptions } from "@/hooks/useApiTyped";
import { StoreContext } from "@/store";
import { useContext } from "react";

const EXCEPTION_BAR_DATA = [
  { dataKey: "unhandledRejection", stackId: "a", fill: "#f1f5f9" },
  { dataKey: "uncaughtException", stackId: "b", fill: "#ffc658" },
];

export default function ExceptionsIndex() {
  const { state } = useContext(StoreContext);
  const { data } = useExceptions.useGraph({});

  return (
    <IndexPageLayout>
      {data && (
        <StatsGrid columns={1}>
          <StatsCard
            title="EXCEPTIONS"
            count={data.count}
            badges={[
              { label: "UNHANDLED", value: data.indexCountOne, variant: "secondary" },
              { label: "UNCAUGHT", value: data.indexCountTwo, variant: "warning" },
            ]}
            graph={
              <CountGraph
                data={data.countFormattedData}
                barData={EXCEPTION_BAR_DATA}
              />
            }
          />
        </StatsGrid>
      )}
      <ExceptionsIndexTable />
    </IndexPageLayout>
  );
}
