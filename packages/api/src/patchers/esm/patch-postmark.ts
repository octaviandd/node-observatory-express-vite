/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchPostmarkExports } from "../shared/postmark-common.js";

if (
  process.env.NODE_OBSERVATORY_MAILER?.includes("postmark") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.POSTMARK_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.POSTMARK_PATCHED_SYMBOL] = true;
  addHook((exports) => patchPostmarkExports(exports, "patch-postmark.ts"));
}
