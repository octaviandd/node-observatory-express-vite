/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchLevelExports } from "../shared/level-common";

if (
  process.env.NODE_OBSERVATORY_CACHE &&
  JSON.parse(process.env.NODE_OBSERVATORY_CACHE).includes("level")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LEVEL_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LEVEL_PATCHED_SYMBOL] = true;
    new Hook(["level"], (exports) => patchLevelExports(exports, __filename));
  }
}
