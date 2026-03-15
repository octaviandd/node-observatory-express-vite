/** @format */

import fs from "fs";
import path from "path";
import { watchers, patchedGlobal } from "../../core/index";
import { inspect } from "util";
import { getCallerInfo } from "../../core/helpers/helpers";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: ExceptionContent) {
  if (watchers?.errors) {
    watchers.errors.insertRedisStream({ ...entry });
  }
}

function formatCodeContext(
  filePath: string,
  line: number,
): { lineNumber: number; content: string; isErrorLine: boolean }[] {
  try {
    const fileContent = fs.readFileSync(path.resolve(filePath), "utf-8");
    const fileLines = fileContent.split("\n");
    const contextLines = fileLines.slice(Math.max(0, line - 3), line + 2);

    return contextLines.map((content, index) => {
      const currentLineNumber = line - 2 + index;
      return {
        lineNumber: currentLineNumber,
        content: content.trim(),
        isErrorLine: currentLineNumber === line,
      };
    });
  } catch {
    return [];
  }
}

function extractErrorDetails(error: any, currentFile: string) {
  if (!error) {
    return {
      message: "Unknown Error",
      stack: "No stack trace available",
      file: "Unknown file",
      line: "unknown",
      title: "Error",
      codeContext: [] as {
        lineNumber: number;
        content: string;
        isErrorLine: boolean;
      }[],
      fullError: "",
    };
  }

  const callerInfo = getCallerInfo(currentFile);
  const file = callerInfo.file;
  const line = Number(callerInfo.line);

  return {
    message: error.message || "No message provided",
    stack: error.stack || "No stack trace available",
    file: file || "Unknown file",
    line: callerInfo.line || "unknown",
    title: error.name || "Error",
    codeContext: file && line ? formatCodeContext(file, line) : [],
    fullError: inspect(error, { depth: null }),
  };
}

function buildEntry(
  type: "uncaughtException" | "unhandledRejection",
  error: any,
  currentFile: string,
): ExceptionContent {
  const details = extractErrorDetails(error, currentFile);

  return {
    metadata: {
      package: "node",
      location: { file: details.file, line: details.line },
      created_at: timestamp(),
    },
    data: {
      message: details.message,
      stack: details.stack,
      file: details.file,
      line: details.line,
      title: details.title,
      codeContext: details.codeContext,
      fullError: details.fullError,
    },
  };
}

export function uncaughtPatcher(currentFile: string) {
  process.on("uncaughtException", (error) => {
    log(buildEntry("uncaughtException", error, currentFile));
  });
}

export function unhandledRejectionPatcher(currentFile: string) {
  process.on("unhandledRejection", (reason) => {
    log(buildEntry("unhandledRejection", reason, currentFile));
  });
}

export function applyExceptionPatchers(currentFile: string) {
  if (!process.env.NODE_OBSERVATORY_ERRORS) return;
  if (patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.EXCEPTIONS_PATCHED_SYMBOL]) return;

  patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.EXCEPTIONS_PATCHED_SYMBOL] = true;

  uncaughtPatcher(currentFile);
  unhandledRejectionPatcher(currentFile);
}
