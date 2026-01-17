/** @format */

import { addHook } from "import-in-the-middle";
import { patchedGlobal } from "../../core/index.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";
import { patchPrismaExports } from "../shared/prisma-common.js";

if (
  process.env.NODE_OBSERVATORY_MODELS?.includes("prisma") &&
  !patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.PRISMA_PATCHED_SYMBOL]
) {
  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.PRISMA_PATCHED_SYMBOL] = true;
  addHook((exports) => patchPrismaExports(exports, "patch-prisma.ts"));
}
