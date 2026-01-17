/** @format */

import { Hook } from "require-in-the-middle";
import { patchedGlobal } from "../../core/index";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";
import { patchPrismaExports } from "../shared/prisma-common";

if (
  process.env.NODE_OBSERVATORY_MODELS &&
  JSON.parse(process.env.NODE_OBSERVATORY_MODELS).includes("prisma")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.PRISMA_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.PRISMA_PATCHED_SYMBOL] = true;
    new Hook(["@prisma/client"], (exports) => patchPrismaExports(exports, __filename));
  }
}
