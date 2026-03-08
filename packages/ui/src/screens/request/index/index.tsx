/** @format */
import RequestIndexTable from "../table/index";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { DurationGraph } from "@/components/ui/graphs/duration-graph";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardSubtitle,
} from "@/components/ui/base/card";
import { Badge } from "@/components/ui/base/badge";
import { useTableData, TableDataContext } from "@/hooks/useTableData";

export default function RequestsIndex() {
  const tableData = useTableData({ key: "requests", defaultInstanceStatusType: "all" });
  const { graphData } = tableData;

  return (
    <TableDataContext.Provider value={tableData}>
      <div className="flex flex-col gap-6 w-full">
        {graphData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    REQUESTS
                  </CardTitle>
                  <CardSubtitle>{graphData.count}</CardSubtitle>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground">1/2/3XX</span>
                    <Badge variant="secondary" className="mt-1">
                      {graphData.indexCountOne}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-center text-yellow-600">
                    <span className="text-muted-foreground">4XX</span>
                    <Badge variant="warning" className="mt-1">
                      {graphData.indexCountTwo}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-center text-red-500">
                    <span className="text-muted-foreground">5XX</span>
                    <Badge variant="destructive" className="mt-1">
                      {graphData.indexCountThree}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-auto">
                  <CountGraph
                    data={graphData.countFormattedData}
                    barData={[
                      {
                        dataKey: "count_200",
                        name: "1/2/3XX",
                        stackId: "a",
                        fill: document.documentElement.classList.contains("dark")
                          ? "#242427"
                          : "#f1f5f9",
                      },
                      { dataKey: "count_400", name: "4XX", stackId: "b", fill: "#ffc658" },
                      { dataKey: "count_500", name: "5XX", stackId: "c", fill: "#ef4444" },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    DURATION
                  </CardTitle>
                  <CardSubtitle>
                    {graphData.shortest} – {graphData.longest}
                  </CardSubtitle>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">AVG</span>
                    <Badge variant="secondary">{graphData.average}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">P95</span>
                    <Badge variant="warning">{graphData.p95}</Badge>
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

        <div className="flex flex-col gap-4">
          <RequestIndexTable />
        </div>
      </div>
    </TableDataContext.Provider>
  );
}
