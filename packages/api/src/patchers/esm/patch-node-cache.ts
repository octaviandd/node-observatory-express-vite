/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchNodeCacheExports } from "../shared/node-cache-common.js";

if (
  process.env.NODE_OBSERVATORY_CACHE?.includes("node-cache") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODECACHE_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODECACHE_PATCHED_SYMBOL] = true;
  addHook((exports) => patchNodeCacheExports(exports, "patch-node-cache.ts"));
}
