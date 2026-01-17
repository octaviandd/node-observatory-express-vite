/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchMysqlExports } from "../shared/mysql-common";

if (
  process.env.NODE_OBSERVATORY_QUERIES &&
  JSON.parse(process.env.NODE_OBSERVATORY_QUERIES).includes("mysql")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MYSQL_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MYSQL_PATCHED_SYMBOL] = true;
    new Hook(["mysql"], (exports) => patchMysqlExports(exports, __filename));
  }
}
