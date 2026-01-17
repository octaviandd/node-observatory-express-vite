/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchIoRedisExports } from "../shared/ioredis-common";

if (
  process.env.NODE_OBSERVATORY_CACHE &&
  JSON.parse(process.env.NODE_OBSERVATORY_CACHE).includes("ioredis")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.IOREDIS_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.IOREDIS_PATCHED_SYMBOL] = true;
    new Hook(["ioredis"], (exports) => patchIoRedisExports(exports, __filename));
  }
}
