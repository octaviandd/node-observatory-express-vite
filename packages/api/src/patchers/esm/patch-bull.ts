/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchBullExports } from "../shared/bull-common.js";

if (
  process.env.NODE_OBSERVATORY_JOBS?.includes("bull") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.BULL_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.BULL_PATCHED_SYMBOL] = true;
  addHook((exports) => patchBullExports(exports, "patch-bull.ts"));
}
