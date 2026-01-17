/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchNodeCacheExports } from "../shared/node-cache-common";

if (
  process.env.NODE_OBSERVATORY_CACHE &&
  JSON.parse(process.env.NODE_OBSERVATORY_CACHE).includes("node-cache")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODECACHE_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODECACHE_PATCHED_SYMBOL] = true;
    new Hook(["node-cache"], (exports) => patchNodeCacheExports(exports, __filename));
  }
}
