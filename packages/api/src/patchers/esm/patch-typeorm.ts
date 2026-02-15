/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchTypeOrmExports } from "../shared/typeorm-common.js";

if (
  process.env.NODE_OBSERVATORY_MODELS?.includes("typeorm") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.TYPEORM_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.TYPEORM_PATCHED_SYMBOL] = true;
  addHook((exports) => patchTypeOrmExports(exports, "patch-typeorm.ts"));
}
