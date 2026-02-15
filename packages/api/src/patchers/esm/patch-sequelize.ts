/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchSequelizeExports } from "../shared/sequelize-common.js";

if (
  process.env.NODE_OBSERVATORY_MODELS?.includes("sequelize") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SEQUELIZE_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SEQUELIZE_PATCHED_SYMBOL] = true;
  addHook((exports) => patchSequelizeExports(exports, "patch-sequelize.ts"));
}
