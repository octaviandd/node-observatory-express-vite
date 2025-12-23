import { up as mysql2Up, down as mysql2Down } from "./mysql2.js";
import { up as mongodbUp, down as mongodbDown } from "./mongodb.js";
import { up as prismaUp, down as prismaDown } from "./prisma.js";
import { Connection as PromiseConnection } from "mysql2/promise";

/**
 * Setup the migrations depending on the database/storage driver.
 * @param driver - The database/storage driver to use.
 * @param connection - The connection details for the database/storage driver.
 */
async function setupMigrations(
  driver: StoreDriver,
  connection: PromiseConnection,
): Promise<void> {
  switch (driver) {
    case "mysql2":
      await mysql2Up(connection);
      break
    default:
      break
  }
}

export { setupMigrations };
