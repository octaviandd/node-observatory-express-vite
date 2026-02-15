/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchSqlite3Exports } from "../shared/sqlite3-common.js";

if (
  process.env.NODE_OBSERVATORY_QUERIES?.includes("sqlite3") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SQLITE3_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SQLITE3_PATCHED_SYMBOL] = true;
  addHook((exports) => patchSqlite3Exports(exports, "patch-sqlite3.ts"));
}
