/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchBunyanExports } from "../shared/bunyan-common.js";

if (
  process.env.NODE_OBSERVATORY_LOGGING?.includes("bunyan") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.BUNYAN_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.BUNYAN_PATCHED_SYMBOL] = true;
  addHook((exports) => patchBunyanExports(exports, "patch-bunyan.ts"));
}
