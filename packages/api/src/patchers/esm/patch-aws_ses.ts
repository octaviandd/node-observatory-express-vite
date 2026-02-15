/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchAwsSesExports } from "../shared/aws_ses-common.js";

if (
  process.env.NODE_OBSERVATORY_MAILER?.includes("@aws-sdk/client-ses") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.AWS_SES_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.AWS_SES_PATCHED_SYMBOL] = true;
  addHook((exports) => patchAwsSesExports(exports, "patch-aws_ses.ts"));
}
