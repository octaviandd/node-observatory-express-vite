/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchPusherExports } from "../shared/pusher-common.js";

if (
  process.env.NODE_OBSERVATORY_NOTIFICATIONS?.includes("pusher") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.PUSHER_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.PUSHER_PATCHED_SYMBOL] = true;
  addHook((exports) => patchPusherExports(exports, "patch-pusher.ts"));
}
