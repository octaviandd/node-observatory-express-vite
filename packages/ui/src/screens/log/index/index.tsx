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
import LogsIndexTable from "../table";
import { useIndexData } from "@/hooks/useIndexData";

const LOG_LEVELS = [
  { dataKey: "info", variant: "secondary", fill: "#F3F7FA" },
  { dataKey: "warn", variant: "warning", fill: "#CA8A03" },
  { dataKey: "error", variant: "error", fill: "#DC2625" },
  { dataKey: "debug", variant: "debug", fill: "#2463EB" },
  { dataKey: "trace", variant: "trace", fill: "#14B8A6" },
  { dataKey: "fatal", variant: "error", fill: "#DC2625" },
  { dataKey: "log", variant: "log", fill: "#6A7280" },
] as const;

export default function LogsIndex() {
  const { data, currentDate, period } = useIndexData({
    type: "logs",
  });

  const graph = data?.graph;
  const table = data?.table;

  return (
    <div className="flex flex-col gap-6">
      {table && graph &&
        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm text-muted-foreground">
                    LOGS
                  </CardTitle>
                  <CardSubtitle>{table.count}</CardSubtitle>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground">INFO</span>
                    <Badge variant="secondary" className="mt-1">
                      {table.indexCountOne}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-center text-muted-foreground">
                    <span className="text-muted-foreground">WARN</span>
                    <Badge variant="warning" className="mt-1">
                      {table.indexCountTwo}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-center text-muted-foreground">
                    <span className="text-muted-foreground">ERROR</span>
                    <Badge variant="destructive" className="mt-1">
                      {table.indexCountThree}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-center text-muted-foreground">
                    <span className="text-muted-foreground">DEBUG</span>
                    <Badge variant="debug" className="mt-1">
                      {table.indexCountFive}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-center text-muted-foreground">
                    <span className="text-muted-foreground">TRACE</span>
                    <Badge variant="trace" className="mt-1">
                      {table.indexCountSix}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-center text-muted-foreground">
                    <span className="text-muted-foreground">FATAL</span>
                    <Badge variant="error" className="mt-1">
                      {table.indexCountSeven}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-center text-muted-foreground">
                    <span className="text-muted-foreground">LOG</span>
                    <Badge variant="log" className="mt-1">
                      {table.indexCountEight}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-auto">
                <CountGraph
                  data={graph.countFormattedData}
                  barData={LOG_LEVELS.map((level) => ({
                    dataKey: level.dataKey,
                    stackId: level.dataKey,
                    fill: level.fill,
                  }))}
                  period={period}
                  currentDate={currentDate}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      }

      <LogsIndexTable />
    </div>
  );
}
