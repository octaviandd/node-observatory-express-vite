/** @format */

import fs from "fs";
import path from "path";
import { watchers, patchedGlobal } from "../../core/index";
import { inspect } from "util";
import { getCallerInfo } from "../../core/helpers/helpers";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants";

interface ExceptionLogEntry {
  metadata: {
    type: "uncaughtException" | "unhandledRejection";
  };
  data: {
    message: string;
    stack: string;
    title: string;
    codeContext: CodeContextLine[] | string;
    fullError?: string;
  };
  location: {
    file: string;
    line: string;
  };
}

interface CodeContextLine {
  lineNumber: number;
  content: string;
  isErrorLine: boolean;
}

function logExceptionEntry(content: ExceptionLogEntry) {
  if (watchers?.errors) {
    watchers.errors.insertRedisStream({
      ...content,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });
  }
}

function formatCodeContext(filePath: string, line: number): CodeContextLine[] {
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
  } catch (err) {
    return [];
  }
}

function extractErrorDetails(error: any): ExceptionLogEntry["data"] & ExceptionLogEntry["location"] {
  if (!error) {
    return {
      message: "Unknown Error",
      stack: "No stack trace available",
      file: "Unknown file",
      line: "unknown",
      title: "Error",
      codeContext: "No context available",
    };
  }

  const callerInfo = getCallerInfo(__filename);
  const file = callerInfo.file;
  const line = Number(callerInfo.line);

  return {
    message: error.message || "No message provided",
    stack: error.stack || "No stack trace available",
    file: callerInfo.file || "Unknown file",
    line: callerInfo.line || "unknown",
    title: error.name || "Error",
    codeContext: file && line ? formatCodeContext(file, line) : "No context available",
    fullError: inspect(error, { depth: null }),
  };
}

function uncaughtPatcher() {
  process.on("uncaughtException", (error) => {
    const details = extractErrorDetails(error);

    logExceptionEntry({
      metadata: {
        type: "uncaughtException",
      },
      data: {
        message: details.message,
        stack: details.stack,
        title: details.title,
        codeContext: details.codeContext,
        fullError: details.fullError,
      },
      location: {
        file: details.file,
        line: details.line,
      },
    });
  });
}

function unhandledRejectionPatcher() {
  process.on("unhandledRejection", (reason) => {
    const details = extractErrorDetails(reason);

    logExceptionEntry({
      metadata: {
        type: "unhandledRejection",
      },
      data: {
        message: details.message,
        stack: details.stack,
        title: details.title,
        codeContext: details.codeContext,
        fullError: details.fullError,
      },
      location: {
        file: details.file,
        line: details.line,
      },
    });
  });
}

if (process.env.NODE_OBSERVATORY_ERRORS) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.EXCEPTIONS_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.EXCEPTIONS_PATCHED_SYMBOL] = true;

    // These patchers are commented out in the original, keeping them that way
    // uncaughtPatcher();
    // unhandledRejectionPatcher();
  }
}

// Export for testing purposes
export { uncaughtPatcher, unhandledRejectionPatcher };
