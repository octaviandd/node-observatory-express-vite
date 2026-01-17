/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchAblyExports } from "../shared/ably-common.js";

if (
  process.env.NODE_OBSERVATORY_NOTIFICATIONS?.includes("ably") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.ABLY_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.ABLY_PATCHED_SYMBOL] = true;

  addHook((exports) => patchAblyExports(exports, "patch-ably.ts"));
}