/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchRedisExports } from "../shared/redis-common";

if (
  process.env.NODE_OBSERVATORY_CACHE &&
  JSON.parse(process.env.NODE_OBSERVATORY_CACHE).includes("redis")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.REDIS_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.REDIS_PATCHED_SYMBOL] = true;
    new Hook(["redis"], (exports) => patchRedisExports(exports, __filename));
  }
}
