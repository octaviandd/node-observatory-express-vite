/** @format */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardSubtitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DurationGraph } from "@/components/ui/graphs/duration-graph";

interface DurationCardProps {
  shortest: string | number;
  longest: string | number;
  average: string | number;
  p95: string | number;
  durationFormattedData: Record<string, { durations: number[], avgDuration: number, p95: number, count: number, label: string }>;
}

export function DurationCard({
  shortest,
  longest,
  average,
  p95,
  durationFormattedData,
}: DurationCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-sm text-muted-foreground">
              DURATION
            </CardTitle>
            <CardSubtitle>
              {shortest} – {longest}
            </CardSubtitle>
          </div>
          <div className="flex gap-4 text-xs">
            <div>
              <span className="text-muted-foreground mr-1">AVG</span>
              <Badge variant="secondary">{average}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground mr-1">P95</span>
              <Badge variant="warning">{p95}</Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-auto">
          <DurationGraph data={durationFormattedData} />
        </div>
      </CardContent>
    </Card>
  );
}

