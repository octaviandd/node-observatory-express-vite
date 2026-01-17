/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchNodemailerExports } from "../shared/nodemailer-common.js";

if (
  process.env.NODE_OBSERVATORY_MAILER?.includes("nodemailer") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODEMAILER_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODEMAILER_PATCHED_SYMBOL] = true;
  addHook((exports) => patchNodemailerExports(exports, "patch-nodemailer.ts"));
}
