/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchMongooseExports } from "../shared/mongoose-common";

if (
  process.env.NODE_OBSERVATORY_MODELS &&
  JSON.parse(process.env.NODE_OBSERVATORY_MODELS).includes("mongoose")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MONGOOSE_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MONGOOSE_PATCHED_SYMBOL] = true;
    new Hook(["mongoose"], (exports) => patchMongooseExports(exports, __filename));
  }
}
