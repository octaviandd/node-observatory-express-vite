/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchNodeCronExports } from "../shared/node-cron-common";

if (
  process.env.NODE_OBSERVATORY_SCHEDULER &&
  JSON.parse(process.env.NODE_OBSERVATORY_SCHEDULER).includes("node-cron")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODECRON_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODECRON_PATCHED_SYMBOL] = true;
    new Hook(["node-cron"], (exports) => patchNodeCronExports(exports, __filename));
  }
}
