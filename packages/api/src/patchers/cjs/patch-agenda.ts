/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchAgendaExports } from "../shared/agenda-common";

if (
  process.env.NODE_OBSERVATORY_JOBS &&
  JSON.parse(process.env.NODE_OBSERVATORY_JOBS).includes("agenda")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.AGENDA_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.AGENDA_PATCHED_SYMBOL] = true;
    new Hook(["agenda"], (exports) => patchAgendaExports(exports, __filename));
  }
}
