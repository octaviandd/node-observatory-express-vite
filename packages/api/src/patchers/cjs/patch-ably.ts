/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchAblyExports } from "../shared/ably-common";

if (
  process.env.NODE_OBSERVATORY_NOTIFICATIONS &&
  JSON.parse(process.env.NODE_OBSERVATORY_NOTIFICATIONS).includes("ably")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.ABLY_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.ABLY_PATCHED_SYMBOL] = true;
    new Hook(["ably"], (exports) => patchAblyExports(exports, __filename));
  }
}
