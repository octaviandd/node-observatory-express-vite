/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchPostmarkExports } from "../shared/postmark-common";

if (
  process.env.NODE_OBSERVATORY_MAILER &&
  JSON.parse(process.env.NODE_OBSERVATORY_MAILER).includes("postmark")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.POSTMARK_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.POSTMARK_PATCHED_SYMBOL] = true;
    new Hook(["postmark"], (exports) => patchPostmarkExports(exports, __filename));
  }
}
