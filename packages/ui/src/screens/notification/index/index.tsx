/** @format */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardSubtitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import NotificationsIndexTable from "../table";
import { DurationGraph } from "@/components/ui/graphs/duration-graph";
import { useIndexData } from "@/hooks/useIndexData";

export default function NotificationsIndex() {
  const { data, currentDate, period } = useIndexData({
    type: "notifications",
  });

  const graph = data?.graph;
  const table = data?.table;

  return (
    <div className="flex flex-col gap-6">
      {table && graph &&
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm text-muted-foreground">
                    NOTIFICATIONS
                  </CardTitle>
                  <CardSubtitle>{table.count}</CardSubtitle>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground mb-1">Completed</span>
                    <Badge variant="secondary">{table.indexCountOne}</Badge>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground mb-1">Failed</span>
                    <Badge variant="error">{table.indexCountTwo}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <CountGraph
                  data={graph.countFormattedData}
                  barData={[
                    { dataKey: "completed", stackId: "a", fill: "#f1f5f9" },
                    { dataKey: "failed", stackId: "b", fill: "#ef4444" },
                  ]}
                  period={period}
                  currentDate={currentDate}
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
                    {table.shortest} – {table.longest}
                  </CardSubtitle>
                </div>
                <div className="flex gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground mr-1">AVG</span>
                    <Badge variant="secondary">{table.average}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-1">P95</span>
                    <Badge variant="warning">{table.p95}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-auto">
                <DurationGraph
                  data={graph.durationFormattedData}
                  period={period}
                  currentDate={currentDate}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      }

      <NotificationsIndexTable />
    </div>
  );
}
