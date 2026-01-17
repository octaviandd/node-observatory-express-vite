/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchIoRedisExports } from "../shared/ioredis-common.js";

if (
  process.env.NODE_OBSERVATORY_CACHE?.includes("ioredis") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.IOREDIS_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.IOREDIS_PATCHED_SYMBOL] = true;
  addHook((exports) => patchIoRedisExports(exports, "patch-ioredis.ts"));
}
