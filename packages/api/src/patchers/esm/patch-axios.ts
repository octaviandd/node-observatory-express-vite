/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchAxiosExports } from "../shared/axios-common.js";

if (
  process.env.NODE_OBSERVATORY_HTTP &&
  JSON.parse(process.env.NODE_OBSERVATORY_HTTP).includes("axios")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.AXIOS_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.AXIOS_PATCHED_SYMBOL] = true;
    addHook((exports: any) => {
      const axiosExports = exports.default || exports;
      if (!axiosExports || typeof axiosExports !== "object") return exports;
      patchAxiosExports(axiosExports, "patch-axios.ts");
      return exports.default ? { ...exports, default: axiosExports } : axiosExports;
    });
  }
}
