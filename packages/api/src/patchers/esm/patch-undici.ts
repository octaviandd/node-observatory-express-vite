/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchUndiciExports } from "../shared/undici-common.js";

if (
  process.env.NODE_OBSERVATORY_HTTP &&
  JSON.parse(process.env.NODE_OBSERVATORY_HTTP).includes("undici")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.UNDICI_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.UNDICI_PATCHED_SYMBOL] = true;
    addHook((exports) => patchUndiciExports(exports, "patch-undici.ts"));
  }
}
