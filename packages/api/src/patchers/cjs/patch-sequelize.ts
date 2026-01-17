/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchSequelizeExports } from "../shared/sequelize-common";

if (
  process.env.NODE_OBSERVATORY_MODELS &&
  JSON.parse(process.env.NODE_OBSERVATORY_MODELS).includes("sequelize")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SEQUELIZE_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SEQUELIZE_PATCHED_SYMBOL] = true;
    new Hook(["sequelize"], (exports) => patchSequelizeExports(exports, __filename));
  }
}
