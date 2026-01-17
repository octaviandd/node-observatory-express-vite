/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchPgExports } from "../shared/pg-common.js";

if (
  process.env.NODE_OBSERVATORY_QUERIES?.includes("pg") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.PG_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.PG_PATCHED_SYMBOL] = true;
  addHook((exports) => patchPgExports(exports, "patch-pg.ts"));
}
