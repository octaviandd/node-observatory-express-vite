/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchSignaleExports } from "../shared/signale-common";

if (
  process.env.NODE_OBSERVATORY_LOGGING &&
  JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("signale")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SIGNALE_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SIGNALE_PATCHED_SYMBOL] = true;
    new Hook(["signale"], (exports) => patchSignaleExports(exports, __filename));
  }
}
