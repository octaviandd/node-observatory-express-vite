/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchAxiosExports } from "../shared/axios-common";

if (
  process.env.NODE_OBSERVATORY_HTTP &&
  JSON.parse(process.env.NODE_OBSERVATORY_HTTP).includes("axios")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.AXIOS_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.AXIOS_PATCHED_SYMBOL] = true;
    new Hook(["axios"], (exports) => patchAxiosExports(exports, __filename));
  }
}
