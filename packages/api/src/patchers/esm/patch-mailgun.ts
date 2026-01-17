/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchMailgunExports } from "../shared/mailgun-common.js";

if (
  process.env.NODE_OBSERVATORY_MAILER?.includes("mailgun.js") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MAILGUN_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MAILGUN_PATCHED_SYMBOL] = true;
  addHook((exports) => patchMailgunExports(exports, "patch-mailgun.ts"));
}
