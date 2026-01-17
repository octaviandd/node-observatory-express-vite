/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchWinstonExports } from "../shared/winston-common.js";

if (
  process.env.NODE_OBSERVATORY_LOGGING?.includes("winston") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.WINSTON_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.WINSTON_PATCHED_SYMBOL] = true;
  addHook((exports) => patchWinstonExports(exports, "patch-winston.ts"));
}
