import { BaseBuilder } from "./BaseBuilder";

class NotificationWatcherSQL extends BaseBuilder {
  /**
   * Helper for notification-specific status filtering.
   * Filters out 'pending' by default as per the original logic.
   */
  private getStatusSQL(status: string | undefined): string {
    const baseFilter = "AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) != 'pending'";
    if (!status || status === "all") return baseFilter;

    return `${baseFilter} AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = '${status}'`;
  }

  /**
   * Data for the "Instance" (flat list) view
   */
  public getIndexTableDataByInstanceSQL(filters: any) {
    const { limit, offset, channel, query, status } = filters;

    const channelSql = channel ? this.getEqualitySQL(channel, "channel") : "";
    const querySql = query ? this.getInclusionSQL(query, "channel") : "";
    const statusSql = this.getStatusSQL(status);

    const whereClause = `WHERE type = 'notification' ${channelSql} ${querySql} ${statusSql}`;

    return {
      items: `SELECT * FROM observatory_entries ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};`,
      count: `SELECT COUNT(*) as total FROM observatory_entries ${whereClause};`,
    };
  }

  /**
   * Data for the "Grouped" (aggregated by channel) view
   */
  public getIndexTableDataByGroupSQL(filters: any) {
    const { period, channel, query, limit, offset } = filters;

    const timeSql = period ? this.getPeriodSQL(period) : "";
    const channelSql = channel ? this.getEqualitySQL(channel, "channel") : "";
    const querySql = query ? this.getInclusionSQL(query, "channel") : "";
    const statusSql = this.getStatusSQL("all"); // Excludes pending

    const columns = [
      "JSON_UNQUOTE(JSON_EXTRACT(content, '$.channel')) AS channel",
      "COUNT(*) as total",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed",
      "SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed",
      "CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
      "CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
      this.getP95SQL("notification")
    ];

    const whereClause = `WHERE type = 'notification' ${timeSql} ${channelSql} ${querySql} ${statusSql}`;

    return {
      items: `
        SELECT ${columns.join(", ")}
        FROM observatory_entries
        ${whereClause}
        GROUP BY channel
        ORDER BY MAX(created_at) DESC
        LIMIT ${limit} OFFSET ${offset};`,
      count: `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.channel'))) as total FROM observatory_entries ${whereClause};`,
    };
  }

  /**
   * Logic for the Notification Graph (Aggregates + Rows)
   */
  public getIndexGraphDataSQL(filters: any) {
    const { period, channel } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const channelSql = channel ? this.getEqualitySQL(channel, "channel") : "";
    const statusSql = this.getStatusSQL("all"); // Excludes pending

    const aggregateColumns = [
      "COUNT(*) as total",
      "CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest",
      "CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest",
      "CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average",
      "SUM(CASE WHEN JSON_EXTRACT(content, '$.status') = 'completed' THEN 1 ELSE 0 END) as completed",
      "SUM(CASE WHEN JSON_EXTRACT(content, '$.status') = 'failed' THEN 1 ELSE 0 END) as failed",
      this.getP95SQL("notification"),
      "NULL as created_at",
      "NULL as content",
      "'aggregate' as type"
    ];

    const rowColumns = [
      "NULL as total", "NULL as shortest", "NULL as longest", "NULL as average",
      "NULL as completed", "NULL as failed", "NULL as p95",
      "created_at", "content", "'row' as type"
    ];

    const whereClause = `WHERE type = 'notification' ${periodSql} ${channelSql} ${statusSql}`;

    return `
      (SELECT ${aggregateColumns.join(", ")} FROM observatory_entries ${whereClause})
      UNION ALL
      (SELECT ${rowColumns.join(", ")} FROM observatory_entries ${whereClause} ORDER BY created_at DESC);
    `;
  }
}

export default NotificationWatcherSQL;