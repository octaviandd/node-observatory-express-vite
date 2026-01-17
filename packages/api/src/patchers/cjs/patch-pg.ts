/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchPgExports } from "../shared/pg-common";

if (
  process.env.NODE_OBSERVATORY_QUERIES &&
  JSON.parse(process.env.NODE_OBSERVATORY_QUERIES).includes("pg")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.PG_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.PG_PATCHED_SYMBOL] = true;
    new Hook(["pg"], (exports) => patchPgExports(exports, __filename));
  }
}
