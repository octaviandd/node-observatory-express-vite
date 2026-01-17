/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchMemjsExports } from "../shared/memjs-common";

if (
  process.env.NODE_OBSERVATORY_CACHE &&
  JSON.parse(process.env.NODE_OBSERVATORY_CACHE).includes("memjs")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MEMJS_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MEMJS_PATCHED_SYMBOL] = true;
    new Hook(["memjs"], (exports) => patchMemjsExports(exports, __filename));
  }
}
