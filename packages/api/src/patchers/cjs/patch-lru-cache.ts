/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchLruCacheExports } from "../shared/lru-cache-common";

if (
  process.env.NODE_OBSERVATORY_CACHE &&
  JSON.parse(process.env.NODE_OBSERVATORY_CACHE).includes("lru-cache")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LRUCACHE_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.LRUCACHE_PATCHED_SYMBOL] = true;
    new Hook(["lru-cache"], (exports) => patchLruCacheExports(exports, __filename));
  }
}
