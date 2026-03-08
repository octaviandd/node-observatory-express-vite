/** @format */

import { StoreContext } from "@/store";
import { CountGraph } from "../ui/graphs/count-graph";
import { DurationGraph } from "../ui/graphs/duration-graph";
import { Link } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardSubtitle,
  CardTitle,
} from "@/components/ui/base/card";
import { Badge } from "@/components/ui/base/badge";
import { Button } from "@/components/ui/base/button";
import {
  ArrowRightCircle,
  LayoutDashboard,
  AlertTriangle,
  ArrowUpDown,
  Database,
  SquareActivity,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { useContext } from "react";
import { formatDuration, formatCount } from "@/utils";
import { useQuery } from "@tanstack/react-query";

function DashboardContent() {
  const { state } = useContext(StoreContext);
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["dashboard", state.period],
    queryFn: async () => {
      const response = await fetch(`/ui/api/dashboard?period=${state.period}`);
      if (!response.ok) {
        throw new Error("Failed to load dashboard");
      }
      return response.json();
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true,
  });

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const { requests, exceptions, jobs, slowRequests, slowQueries } = dashboardData;
  const hasSlowRequests = slowRequests && slowRequests.length > 0;
  const hasSlowQueries = slowQueries && slowQueries.length > 0;
  const hasExceptions = exceptions?.count && parseInt(exceptions.count.count) > 0;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pt-2 pb-1 px-2">
          <div className="flex items-center gap-2">
            <SquareActivity className="h-5 w-5" />
            <CardTitle>Activity</CardTitle>
          </div>
          <Button variant="outline" asChild>
            <Link to="/requests" className="flex items-center gap-2">
              REQUESTS
              <ArrowRightCircle className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        {requests?.count && requests?.duration && (
          <CardContent className="p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      REQUESTS
                    </CardTitle>
                    <CardSubtitle>{requests.count.count}</CardSubtitle>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div className="flex flex-col items-center">
                      <span className="text-muted-foreground">1/2/3XX</span>
                      <Badge variant="secondary" className="mt-1">
                        {requests.count.indexCountOne}
                      </Badge>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-muted-foreground">4XX</span>
                      <Badge variant="warning" className="mt-1">
                        {requests.count.indexCountTwo}
                      </Badge>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-muted-foreground">5XX</span>
                      <Badge variant="destructive" className="mt-1">
                        {requests.count.indexCountThree}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-auto">
                    <CountGraph
                      data={requests.count.countFormattedData}
                      barData={[
                        { dataKey: "count_200", name: "1/2/3XX", stackId: "a", fill: "#22c55e" },
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
                      {requests.duration.shortest} – {requests.duration.longest}
                    </CardSubtitle>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">AVG</span>
                      <Badge variant="secondary">
                        {requests.duration.average}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">P95</span>
                      <Badge variant="warning">
                        {requests.duration.p95}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-auto">
                    <DurationGraph data={requests.duration.durationFormattedData} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pt-2 pb-1 px-2">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            <CardTitle>Application</CardTitle>
          </div>
          <Button variant="outline" asChild>
            <Link to="/jobs" className="flex items-center gap-2">
              JOBS
              <ArrowRightCircle className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exceptions?.count && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      EXCEPTIONS
                    </CardTitle>
                  </div>
                  <CardSubtitle>
                    {exceptions.count.count} exceptions were logged in the last{" "}
                    {state.period === "7d"
                      ? "7 days"
                      : state.period === "14d"
                        ? "14 days"
                        : state.period === "30d"
                          ? "30 days"
                          : state.period === "24h"
                            ? "24 hours"
                            : "1 hour"}
                    .
                  </CardSubtitle>
                </CardHeader>
                <CardContent>
                  {hasExceptions ? (
                    <>
                      <div className="h-auto">
                        <CountGraph
                          data={exceptions.count.countFormattedData}
                          barData={[
                            {
                              dataKey: "unhandledRejection",
                              name: "Unhandled",
                              stackId: "a",
                              fill: "#ffc658",
                            },
                            {
                              dataKey: "uncaughtException",
                              name: "Uncaught",
                              stackId: "b",
                              fill: "#ef4444",
                            },
                          ]}
                        />
                      </div>

                      <Button variant="outline" asChild className="w-full mt-4">
                        <Link
                          to="/exceptions"
                          className="flex items-center justify-center gap-2"
                        >
                          View Details
                          <ArrowRightCircle className="h-4 w-4" />
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">
                        All Clear!
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        No exceptions in this period
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 grid-rows-2 gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      SLOW REQUESTS
                    </CardTitle>
                  </div>
                  <CardSubtitle>
                    {formatCount(slowRequests?.length || 0)} routes slower than 1000ms
                  </CardSubtitle>
                </CardHeader>
                <CardContent>
                  {hasSlowRequests ? (
                    <>
                      <div className="space-y-2">
                        {slowRequests.map((request: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium">
                                {request.route}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {request.count} requests
                              </span>
                            </div>
                            <Badge variant="warning">
                              {formatDuration(request.average)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" asChild className="w-full mt-4">
                        <Link
                          to="/requests"
                          className="flex items-center justify-center gap-2"
                        >
                          View All
                          <ArrowRightCircle className="h-4 w-4" />
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <TrendingUp className="h-10 w-10 text-green-500 mb-2" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Great Performance!
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        All routes under 1000ms
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      SLOW QUERIES
                    </CardTitle>
                  </div>
                  <CardSubtitle>
                    {formatCount(slowQueries?.length || 0)} endpoints slower than 1000ms
                  </CardSubtitle>
                </CardHeader>
                <CardContent>
                  {hasSlowQueries ? (
                    <>
                      <div className="space-y-2">
                        {slowQueries.map((query: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium">
                                {query.endpoint}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {query.count} queries
                              </span>
                            </div>
                            <Badge variant="warning">
                              {formatDuration(query.p95)}
                            </Badge>
                          </div>
                        ))}
                      </div>

                      <Button variant="outline" asChild className="w-full mt-4">
                        <Link
                          to="/queries"
                          className="flex items-center justify-center gap-2"
                        >
                          View All
                          <ArrowRightCircle className="h-4 w-4" />
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <TrendingUp className="h-10 w-10 text-green-500 mb-2" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Optimized Queries!
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        All queries under 1000ms
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {jobs?.count && jobs?.duration && (
              <Card>
                <CardHeader>
                  <div className="flex text-xs">
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-muted-foreground">JOB ATTEMPTS</span>
                      <span className="font-medium">{jobs.count.count}</span>
                    </div>
                  </div>
                  <div className="flex text-xs gap-x-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">COMPLETED</span>
                      <span className="font-medium text-green-500">
                        {jobs.count.indexCountOne}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">RELEASED</span>
                      <span className="font-medium text-[#ffc658]">
                        {jobs.count.indexCountTwo}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">FAILED</span>
                      <span className="font-medium text-destructive">
                        {jobs.count.indexCountThree}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="h-auto">
                    <CountGraph
                      data={jobs.count.countFormattedData}
                      barData={[
                        { dataKey: "completed", name: "Completed", stackId: "a", fill: "#22c55e" },
                        { dataKey: "released", name: "Released", stackId: "b", fill: "#ffc658" },
                        { dataKey: "failed", name: "Failed", stackId: "c", fill: "#ef4444" },
                      ]}
                    />
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">JOBS DURATION</p>
                    <CardSubtitle>
                      {jobs.duration.shortest} – {jobs.duration.longest}
                    </CardSubtitle>
                    <div className="h-auto">
                      <DurationGraph data={jobs.duration.durationFormattedData} />
                    </div>
                  </div>

                  <Button variant="outline" asChild className="w-full">
                    <Link
                      to="/jobs"
                      className="flex items-center justify-center gap-2"
                    >
                      View Details
                      <ArrowRightCircle className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}