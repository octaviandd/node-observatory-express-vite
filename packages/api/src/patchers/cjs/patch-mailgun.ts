/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchMailgunExports } from "../shared/mailgun-common";

if (
  process.env.NODE_OBSERVATORY_MAILER &&
  JSON.parse(process.env.NODE_OBSERVATORY_MAILER).includes("mailgun.js")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MAILGUN_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MAILGUN_PATCHED_SYMBOL] = true;
    new Hook(["mailgun.js"], (exports) => patchMailgunExports(exports, __filename));
  }
}
