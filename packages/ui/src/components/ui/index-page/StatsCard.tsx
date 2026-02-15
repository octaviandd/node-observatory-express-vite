/** @format */

import { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardSubtitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface StatBadge {
  label: string;
  value: string | number;
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "error" | "debug" | "trace" | "log";
}

interface StatsCardProps {
  title: string;
  count: string | number;
  badges: StatBadge[];
  graph: ReactNode;
  /** Grid columns for the cards container. Defaults to 2 */
  columns?: 1 | 2;
}

export function StatsCard({ title, count, badges, graph }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-sm text-muted-foreground">
              {title}
            </CardTitle>
            <CardSubtitle>{count}</CardSubtitle>
          </div>
          <div className="flex gap-4 text-xs">
            {badges.map((badge) => (
              <div key={badge.label} className="flex flex-col items-center">
                <span className="text-muted-foreground">{badge.label}</span>
                <Badge variant={badge.variant ?? "secondary"} className="mt-1">
                  {badge.value}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-auto">{graph}</div>
      </CardContent>
    </Card>
  );
}

