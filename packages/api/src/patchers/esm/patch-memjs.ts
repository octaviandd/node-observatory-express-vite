/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchMemjsExports } from "../shared/memjs-common.js";

if (
  process.env.NODE_OBSERVATORY_CACHE?.includes("memjs") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MEMJS_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MEMJS_PATCHED_SYMBOL] = true;
  addHook((exports) => patchMemjsExports(exports, "patch-memjs.ts"));
}
