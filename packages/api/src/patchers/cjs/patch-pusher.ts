/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchPusherExports } from "../shared/pusher-common";

if (
  process.env.NODE_OBSERVATORY_NOTIFICATIONS &&
  JSON.parse(process.env.NODE_OBSERVATORY_NOTIFICATIONS).includes("pusher")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.PUSHER_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.PUSHER_PATCHED_SYMBOL] = true;
    new Hook(["pusher"], (exports) => patchPusherExports(exports, __filename));
  }
}
