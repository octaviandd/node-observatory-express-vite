/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchSendgridExports } from "../shared/sendgrid-common.js";

if (
  process.env.NODE_OBSERVATORY_MAILER?.includes("@sendgrid/mail") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SENDGRID_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SENDGRID_PATCHED_SYMBOL] = true;
  addHook((exports) => patchSendgridExports(exports, "patch-sendgrid.ts"));
}
