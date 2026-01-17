/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchAgendaExports } from "../shared/agenda-common.js";

if (
  process.env.NODE_OBSERVATORY_JOBS?.includes("agenda") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.AGENDA_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.AGENDA_PATCHED_SYMBOL] = true;
  addHook((exports) => patchAgendaExports(exports, "patch-agenda.ts"));
}
