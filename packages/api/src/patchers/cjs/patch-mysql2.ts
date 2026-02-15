/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchMysql2Exports } from "../shared/mysql2-common";

if (
  process.env.NODE_OBSERVATORY_QUERIES &&
  JSON.parse(process.env.NODE_OBSERVATORY_QUERIES).includes("mysql2")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MYSQL2_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MYSQL2_PATCHED_SYMBOL] = true;
    new Hook(["mysql2/promise"], (exports) => patchMysql2Exports(exports, __filename));
  }
}
