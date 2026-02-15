/** @format */

import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { applyFetchPatch } from "../shared/fetch-common";

if (
  process.env.NODE_OBSERVATORY_HTTP &&
  JSON.parse(process.env.NODE_OBSERVATORY_HTTP).includes("fetch")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.FETCH_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.FETCH_PATCHED_SYMBOL] = true;
    applyFetchPatch(__filename);
  }
}
