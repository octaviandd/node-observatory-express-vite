/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchLoglevelExports } from "../shared/loglevel-common.js";

if (
  process.env.NODE_OBSERVATORY_LOGGING?.includes("loglevel") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LOGLEVEL_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LOGLEVEL_PATCHED_SYMBOL] = true;
  addHook((exports) => patchLoglevelExports(exports, "patch-loglevel.ts"));
}
