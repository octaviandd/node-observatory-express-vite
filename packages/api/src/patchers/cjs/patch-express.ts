/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchExpressExports } from "../shared/express-common";

if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.EXPRESS_PATCHED_SYMBOL]) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.EXPRESS_PATCHED_SYMBOL] = true;
  new Hook(["express"], (exports) => patchExpressExports(exports));
}
