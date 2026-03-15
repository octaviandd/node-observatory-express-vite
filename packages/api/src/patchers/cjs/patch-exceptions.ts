/** @format */

import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { applyExceptionPatchers } from "../shared/exception-common";

if (
  process.env.NODE_OBSERVATORY_ERRORS &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.EXCEPTIONS_PATCHED_SYMBOL]
) {
  applyExceptionPatchers(__filename);
}
