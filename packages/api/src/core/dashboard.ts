/** @format */

import type Database from "./databases/sql/Base.js";

class DashboardController {
  db!: Database; // Will be injected during initialization

  async getDashboardData(
    request: ObservatoryBoardRequest,
  ): Promise<ApiResponse<DashboardData>> {
    try {
      const period = (request.query.period as string) || "24h";

      // Build filter objects
      const requestGraphFilters = { period, status: "all" } as any;
      const exceptionGraphFilters = { period, status: "all" } as any;
      const jobGraphFilters = { period, status: "all" } as any;

      const requestTableFilters = {
        offset: 0,
        limit: 100,
        period,
        index: "group",
      } as any;

      const queryTableFilters = {
        offset: 0,
        limit: 100,
        period,
        index: "group",
      } as any;

      // Fetch all data in parallel
      const [
        requestsGraphResult,
        exceptionsGraphResult,
        jobsGraphResult,
        groupedRequests,
        groupedQueries,
      ] = await Promise.all([
        // Get combined count + duration data for requests
        this.getGraphData(requestGraphFilters, "request", [
          "count_200",
          "count_400",
          "count_500",
        ]),

        // Get combined count + duration data for exceptions
        this.getGraphData(exceptionGraphFilters, "exception", [
          "unhandledRejection",
          "uncaughtException",
        ]),

        // Get combined count + duration data for jobs
        this.getGraphData(jobGraphFilters, "job", [
          "completed",
          "released",
          "failed",
        ]),

        // Get grouped requests table
        this.db.getByGroup(requestTableFilters, "request"),

        // Get grouped queries table
        this.db.getByGroup(queryTableFilters, "query"),
      ]);

      // Filter slow requests/queries
      const slowRequests = groupedRequests.results
        .filter((r: any) => r.average > 1000)
        .slice(0, 3);

      const slowQueries = groupedQueries.results
        .filter((q: any) => q.p95 > 1000)
        .slice(0, 3);

      return {
        body: {
          requests: {
            count: requestsGraphResult.count,
            duration: requestsGraphResult.duration,
          },
          exceptions: {
            count: exceptionsGraphResult.count,
          },
          jobs: {
            count: jobsGraphResult.count,
            duration: jobsGraphResult.duration,
          },
          slowRequests,
          slowQueries,
        },
        statusCode: 200,
      };
    } catch (error: any) {
      console.error("Dashboard error:", error);
      return {
        body: { error: error.message } as any,
        statusCode: 500,
      };
    }
  }

  /**
   * Helper to get both count and duration graph data
   */
  private async getGraphData(
    filters: WatcherFilters,
    watcherType: string,
    countKeys: string[],
  ) {
    // Use the existing methods that split the data internally
    const [countData, durationData] = await Promise.all([
      this.db.getCountGraphData(filters, watcherType as any, countKeys),
      this.db.getDurationGraphData(filters, watcherType as any),
    ]);

    return {
      count: countData,
      duration: durationData,
    };
  }
}

export const dashboardController = new DashboardController();
