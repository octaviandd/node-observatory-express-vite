/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchLoglevelExports } from "../shared/loglevel-common";

if (
  process.env.NODE_OBSERVATORY_LOGGING &&
  JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("loglevel")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LOGLEVEL_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LOGLEVEL_PATCHED_SYMBOL] = true;
    new Hook(["loglevel"], (exports) => patchLoglevelExports(exports, __filename));
  }
}
