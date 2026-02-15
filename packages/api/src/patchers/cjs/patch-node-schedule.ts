/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchNodeScheduleExports } from "../shared/node-schedule-common";

if (
  process.env.NODE_OBSERVATORY_SCHEDULER &&
  JSON.parse(process.env.NODE_OBSERVATORY_SCHEDULER).includes("node-schedule")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODESCHEDULE_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODESCHEDULE_PATCHED_SYMBOL] = true;
    new Hook(["node-schedule"], (exports) => patchNodeScheduleExports(exports, __filename));
  }
}
