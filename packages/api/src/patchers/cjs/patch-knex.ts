/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchKnexExports } from "../shared/knex-common";

if (
  process.env.NODE_OBSERVATORY_QUERIES &&
  JSON.parse(process.env.NODE_OBSERVATORY_QUERIES).includes("knex")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.KNEX_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.KNEX_PATCHED_SYMBOL] = true;
    new Hook(["knex"], (exports) => patchKnexExports(exports, __filename));
  }
}
