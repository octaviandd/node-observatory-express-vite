/** @format */

import {
  Card,
  CardContent,
  CardHeader,
  CardSubtitle,
  CardTitle,
} from "@/components/ui/base/card";
import { Badge } from "@/components/ui/base/badge";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import SchedulesIndexTable from "../table";
import { DurationGraph } from "@/components/ui/graphs/duration-graph";
import { useTableData, TableDataContext } from "@/hooks/useTableData";

export default function SchedulesIndex() {
  const tableData = useTableData({ key: "schedules", defaultInstanceStatusType: "all" });
  const { graphData } = tableData;

  return (
    <TableDataContext.Provider value={tableData}>
      <div className="flex flex-col gap-6">
        {graphData && (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-sm text-muted-foreground">
                      RUNS
                    </CardTitle>
                    <CardSubtitle>{graphData.count}</CardSubtitle>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div className="flex flex-col items-center">
                      <span className="text-muted-foreground">COMPLETED</span>
                      <Badge variant="secondary" className="mt-1">
                        {graphData.indexCountOne}
                      </Badge>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-muted-foreground">FAILED</span>
                      <Badge variant="error" className="mt-1">
                        {graphData.indexCountTwo}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-auto">
                  <CountGraph
                    data={graphData.countFormattedData}
                    barData={[
                      { dataKey: "completed", stackId: "a", fill: "#f1f5f9" },
                      { dataKey: "failed", stackId: "c", fill: "#ef4444" },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-sm text-muted-foreground">
                      DURATION
                    </CardTitle>
                    <CardSubtitle>
                      {graphData.shortest} – {graphData.longest}
                    </CardSubtitle>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground mr-1">AVG</span>
                      <Badge variant="secondary">{graphData.average}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground mr-1">P95</span>
                      <Badge variant="warning">{graphData.p95}</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-auto">
                  <DurationGraph data={graphData.durationFormattedData} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <SchedulesIndexTable />
      </div>
    </TableDataContext.Provider>
  );
}
