/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchSignaleExports } from "../shared/signale-common.js";

if (
  process.env.NODE_OBSERVATORY_LOGGING?.includes("signale") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SIGNALE_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SIGNALE_PATCHED_SYMBOL] = true;
  addHook((exports) => patchSignaleExports(exports, "patch-signale.ts"));
}
