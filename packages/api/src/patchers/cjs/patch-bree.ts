/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchBreeExports } from "../shared/bree-common";

if (
  process.env.NODE_OBSERVATORY_SCHEDULER &&
  JSON.parse(process.env.NODE_OBSERVATORY_SCHEDULER).includes("bree")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.BREE_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.BREE_PATCHED_SYMBOL] = true;
    new Hook(["bree"], (exports) => patchBreeExports(exports, __filename));
  }
}
