/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchBreeExports } from "../shared/bree-common.js";

if (
  process.env.NODE_OBSERVATORY_SCHEDULER?.includes("bree") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.BREE_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.BREE_PATCHED_SYMBOL] = true;
  addHook((exports) => patchBreeExports(exports, "patch-bree.ts"));
}
