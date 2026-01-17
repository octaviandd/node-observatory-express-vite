/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchMongooseExports } from "../shared/mongoose-common.js";

if (
  process.env.NODE_OBSERVATORY_MODELS &&
  JSON.parse(process.env.NODE_OBSERVATORY_MODELS).includes("mongoose")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MONGOOSE_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MONGOOSE_PATCHED_SYMBOL] = true;
    addHook((exports) => patchMongooseExports(exports, "patch-mongoose.ts"));
  }
}
