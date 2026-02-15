/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchPinoExports } from "../shared/pino-common.js";

if (
  process.env.NODE_OBSERVATORY_LOGGING?.includes("pino") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.PINO_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.PINO_PATCHED_SYMBOL] = true;
  addHook((exports) => patchPinoExports(exports, "patch-pino.ts"));
}
