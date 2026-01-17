/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchExpressExports } from "../shared/express-common.js";

if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.EXPRESS_PATCHED_SYMBOL]) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.EXPRESS_PATCHED_SYMBOL] = true;
  addHook((exports: any) => {
    const expressExports = exports.default || exports;
    if (!expressExports || typeof expressExports !== "object") return exports;
    patchExpressExports(expressExports);
    return exports.default ? { ...exports, default: expressExports } : expressExports;
  });
}
