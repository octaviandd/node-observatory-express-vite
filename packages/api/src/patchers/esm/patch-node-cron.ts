/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchNodeCronExports } from "../shared/node-cron-common.js";

if (
  process.env.NODE_OBSERVATORY_SCHEDULER?.includes("node-cron") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODECRON_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODECRON_PATCHED_SYMBOL] = true;
  addHook((exports) => patchNodeCronExports(exports, "patch-node-cron.ts"));
}
