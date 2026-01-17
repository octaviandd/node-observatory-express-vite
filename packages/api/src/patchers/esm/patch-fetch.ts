/** @format */

import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { applyFetchPatch } from "../shared/fetch-common.js";

if (
  process.env.NODE_OBSERVATORY_HTTP &&
  JSON.parse(process.env.NODE_OBSERVATORY_HTTP).includes("fetch")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.FETCH_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.FETCH_PATCHED_SYMBOL] = true;
    applyFetchPatch("patch-fetch.ts");
  }
}
