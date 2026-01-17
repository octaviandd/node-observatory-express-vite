/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchBunyanExports } from "../shared/bunyan-common";

if (
  process.env.NODE_OBSERVATORY_LOGGING &&
  JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("bunyan")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.BUNYAN_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.BUNYAN_PATCHED_SYMBOL] = true;
    new Hook(["bunyan"], (exports) => patchBunyanExports(exports, __filename));
  }
}
