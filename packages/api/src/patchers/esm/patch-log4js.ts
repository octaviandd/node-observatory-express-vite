/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchLog4jsExports } from "../shared/log4js-common.js";

if (
  process.env.NODE_OBSERVATORY_LOGGING?.includes("log4js") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LOG4JS_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LOG4JS_PATCHED_SYMBOL] = true;
  addHook((exports) => patchLog4jsExports(exports, "patch-log4js.ts"));
}
