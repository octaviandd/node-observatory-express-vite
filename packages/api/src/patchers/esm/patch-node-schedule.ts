/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchNodeScheduleExports } from "../shared/node-schedule-common.js";

if (
  process.env.NODE_OBSERVATORY_SCHEDULER?.includes("node-schedule") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODESCHEDULE_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODESCHEDULE_PATCHED_SYMBOL] = true;
  addHook((exports) => patchNodeScheduleExports(exports, "patch-node-schedule.ts"));
}
