/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchWinstonExports } from "../shared/winston-common";

if (
  process.env.NODE_OBSERVATORY_LOGGING &&
  JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("winston")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.WINSTON_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.WINSTON_PATCHED_SYMBOL] = true;
    new Hook(["winston"], (exports) => patchWinstonExports(exports, __filename));
  }
}
