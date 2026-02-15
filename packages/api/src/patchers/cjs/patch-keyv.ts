/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchKeyvExports } from "../shared/keyv-common";

if (
  process.env.NODE_OBSERVATORY_CACHE &&
  JSON.parse(process.env.NODE_OBSERVATORY_CACHE).includes("keyv")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.KEYV_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.KEYV_PATCHED_SYMBOL] = true;
    new Hook(["keyv"], (exports) => patchKeyvExports(exports, __filename));
  }
}
