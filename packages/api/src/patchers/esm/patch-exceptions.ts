/** @format */

import { fileURLToPath } from "url";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { applyExceptionPatchers } from "../shared/exception-common.js";

//@ts-ignore
const __filename = fileURLToPath(import.meta.url);

if (
  process.env.NODE_OBSERVATORY_ERRORS &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.EXCEPTIONS_PATCHED_SYMBOL]
) {
  applyExceptionPatchers(__filename);
}
