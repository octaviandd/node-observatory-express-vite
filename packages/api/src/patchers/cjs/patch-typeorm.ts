/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchTypeOrmExports } from "../shared/typeorm-common";

if (
  process.env.NODE_OBSERVATORY_MODELS &&
  JSON.parse(process.env.NODE_OBSERVATORY_MODELS).includes("typeorm")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.TYPEORM_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.TYPEORM_PATCHED_SYMBOL] = true;
    new Hook(["typeorm"], (exports) => patchTypeOrmExports(exports, __filename));
  }
}
