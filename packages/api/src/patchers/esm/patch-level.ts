/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchLevelExports } from "../shared/level-common.js";

if (
  process.env.NODE_OBSERVATORY_CACHE?.includes("level") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LEVEL_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LEVEL_PATCHED_SYMBOL] = true;
  addHook((exports) => patchLevelExports(exports, "patch-level.ts"));
}
