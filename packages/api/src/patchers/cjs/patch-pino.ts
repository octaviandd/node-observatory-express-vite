/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchPinoExports } from "../shared/pino-common";

if (
  process.env.NODE_OBSERVATORY_LOGGING &&
  JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("pino")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.PINO_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.PINO_PATCHED_SYMBOL] = true;
    new Hook(["pino"], (exports) => patchPinoExports(exports, __filename));
  }
}
