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
import { useRequests } from "@/hooks/useApiTyped";
import { useSearchParams } from "react-router";

export default function RequestsIndex() {
  const [searchParams] = useSearchParams();

  const period = searchParams.get("period") as any;
  const status = searchParams.get("status") || undefined;
  const q = searchParams.get("q") || undefined;
  const key = searchParams.get("key") || undefined;

  const { data, isLoading } = useRequests.useGraph({
    period,
    status,
    q,
    key,
  });

  if (isLoading || !data) return null;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                REQUESTS
              </CardTitle>
              <CardSubtitle>{data.count}</CardSubtitle>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="flex flex-col items-center">
                <span className="text-muted-foreground">1/2/3XX</span>
                <Badge variant="secondary" className="mt-1">
                  {data.indexCountOne}
                </Badge>
              </div>
              <div className="flex flex-col items-center text-yellow-600">
                <span className="text-muted-foreground">4XX</span>
                <Badge variant="warning" className="mt-1">
                  {data.indexCountTwo}
                </Badge>
              </div>
              <div className="flex flex-col items-center text-red-500">
                <span className="text-muted-foreground">5XX</span>
                <Badge variant="destructive" className="mt-1">
                  {data.indexCountThree}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-auto">
              <CountGraph
                data={data.countFormattedData}
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
                {data.shortest} – {data.longest}
              </CardSubtitle>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">AVG</span>
                <Badge variant="secondary">{data.average}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">P95</span>
                <Badge variant="warning">{data.p95}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-auto">
              <DurationGraph data={data.durationFormattedData} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <RequestIndexTable />
      </div>
    </div>
  );
}