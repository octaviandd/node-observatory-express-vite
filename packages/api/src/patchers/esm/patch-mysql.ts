/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchMysqlExports } from "../shared/mysql-common.js";

if (
  process.env.NODE_OBSERVATORY_QUERIES?.includes("mysql") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MYSQL_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MYSQL_PATCHED_SYMBOL] = true;
  addHook((exports) => patchMysqlExports(exports, "patch-mysql.ts"));
}
