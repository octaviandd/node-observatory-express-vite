/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchKnexExports } from "../shared/knex-common.js";

if (
  process.env.NODE_OBSERVATORY_QUERIES?.includes("knex") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.KNEX_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.KNEX_PATCHED_SYMBOL] = true;
  addHook((exports) => patchKnexExports(exports, "patch-knex.ts"));
}
