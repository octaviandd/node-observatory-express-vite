/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchAwsSesExports, patchAwsSdkExports } from "../shared/aws_ses-common";

if (
  process.env.NODE_OBSERVATORY_MAILER &&
  JSON.parse(process.env.NODE_OBSERVATORY_MAILER).includes("@aws-sdk/client-ses")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.AWS_SES_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.AWS_SES_PATCHED_SYMBOL] = true;
    new Hook(["@aws-sdk/client-ses"], (exports) => patchAwsSesExports(exports, __filename));
    new Hook(["@aws-sdk"], (exports) => patchAwsSdkExports(exports, __filename));
  }
}
