/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchKeyvExports } from "../shared/keyv-common.js";

if (
  process.env.NODE_OBSERVATORY_CACHE?.includes("keyv") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.KEYV_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.KEYV_PATCHED_SYMBOL] = true;
  addHook((exports) => patchKeyvExports(exports, "patch-keyv.ts"));
}
