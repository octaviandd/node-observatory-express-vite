/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchUndiciExports } from "../shared/undici-common";

if (process.env.NODE_OBSERVATORY_HTTP?.includes("undici")) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.UNDICI_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.UNDICI_PATCHED_SYMBOL] = true;
    new Hook(["undici"], (exports) => patchUndiciExports(exports, __filename));
  }
}
