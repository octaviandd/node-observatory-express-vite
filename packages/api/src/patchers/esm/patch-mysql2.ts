/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchMysql2Exports } from "../shared/mysql2-common.js";

if (
  process.env.NODE_OBSERVATORY_QUERIES?.includes("mysql2") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MYSQL2_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MYSQL2_PATCHED_SYMBOL] = true;
  addHook((exports) => patchMysql2Exports(exports, "patch-mysql2.ts"));
}
