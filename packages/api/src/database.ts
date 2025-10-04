import { Connection } from "mysql2";

class Database {
  storeConnection!: Connection

  constructor(storeConnection: Connection) {
    this.storeConnection = storeConnection;
  }


  async getAllEntriesByType(type: string): Promise<any> {

    // @ts-expect-error
    const [results] = await this.storeConnection.query(
      "SELECT * FROM observatory_entries WHERE type = ?",
      [type],
    );
    
    return results;
  }


  async up(
    connection: Connection,
  ): Promise<void> {
    try {
      const [rows]: any = await (connection).query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        AND table_name = 'observatory_entries'
      `);

      if (rows[0].count === 0) {
        await (connection).query(`
          CREATE TABLE observatory_entries (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            uuid CHAR(36) NOT NULL UNIQUE,
            request_id CHAR(36) NULL,
            job_id CHAR(36) NULL,
            schedule_id CHAR(36) NULL,
            type VARCHAR(20) NOT NULL,
            content JSON NOT NULL,
            created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),

            INDEX idx_uuid (uuid),
            INDEX idx_request_id (request_id),
            INDEX idx_job_id (job_id),
            INDEX idx_schedule_id (schedule_id),
            INDEX idx_type (type),
            INDEX idx_created_at (created_at)
          );
        `);
        console.log("observatory_entries table created via mysql2/promise");
      }
    } catch (e: unknown) {
      console.error(
        `Failed to create observatory_entires table via mysql2/promise: ${e}`,
      );
    }
  }
}

export default Database;