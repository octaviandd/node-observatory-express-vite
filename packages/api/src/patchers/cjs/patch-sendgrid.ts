/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchSendgridExports } from "../shared/sendgrid-common";

if (
  process.env.NODE_OBSERVATORY_MAILER &&
  JSON.parse(process.env.NODE_OBSERVATORY_MAILER).includes("@sendgrid/mail")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SENDGRID_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SENDGRID_PATCHED_SYMBOL] = true;
    new Hook(["@sendgrid/mail"], (exports) => patchSendgridExports(exports, __filename));
  }
}
