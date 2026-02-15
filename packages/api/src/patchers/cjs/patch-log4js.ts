/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchLog4jsExports } from "../shared/log4js-common";

if (
  process.env.NODE_OBSERVATORY_LOGGING &&
  JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("log4js")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LOG4JS_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LOG4JS_PATCHED_SYMBOL] = true;
    new Hook(["log4js"], (exports) => patchLog4jsExports(exports, __filename));
  }
}
