/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchSqlite3Exports } from "../shared/sqlite3-common";

if (
  process.env.NODE_OBSERVATORY_QUERIES &&
  JSON.parse(process.env.NODE_OBSERVATORY_QUERIES).includes("sqlite3")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SQLITE3_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SQLITE3_PATCHED_SYMBOL] = true;
    new Hook(["sqlite3"], (exports) => patchSqlite3Exports(exports, __filename));
  }
}
