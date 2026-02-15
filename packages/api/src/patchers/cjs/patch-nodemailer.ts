/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchNodemailerExports } from "../shared/nodemailer-common";

if (
  process.env.NODE_OBSERVATORY_MAILER &&
  JSON.parse(process.env.NODE_OBSERVATORY_MAILER).includes("nodemailer")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODEMAILER_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.NODEMAILER_PATCHED_SYMBOL] = true;
    new Hook(["nodemailer"], (exports) => patchNodemailerExports(exports, __filename));
  }
}
