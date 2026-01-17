/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchRedisExports } from "../shared/redis-common.js";

if (
  process.env.NODE_OBSERVATORY_CACHE?.includes("redis") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.REDIS_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.REDIS_PATCHED_SYMBOL] = true;
  addHook((exports) => patchRedisExports(exports, "patch-redis.ts"));
}
