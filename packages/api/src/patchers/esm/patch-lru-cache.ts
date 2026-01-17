/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchLruCacheExports } from "../shared/lru-cache-common.js";

if (
  process.env.NODE_OBSERVATORY_CACHE?.includes("lru-cache") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LRUCACHE_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LRUCACHE_PATCHED_SYMBOL] = true;
  addHook((exports) => patchLruCacheExports(exports, "patch-lru-cache.ts"));
}
