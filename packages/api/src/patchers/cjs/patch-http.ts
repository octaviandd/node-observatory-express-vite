/** @format */

import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { applyHttpPatches } from "../shared/http-common";

if (
  process.env.NODE_OBSERVATORY_HTTP &&
  JSON.parse(process.env.NODE_OBSERVATORY_HTTP).includes("http")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.HTTP_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.HTTP_PATCHED_SYMBOL] = true;
    applyHttpPatches(__filename);
  }
}
