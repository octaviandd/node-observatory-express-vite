/** @format */

/// <reference types="@node-observatory/types" />

declare global {
  namespace Express {
    interface Request {
      session?: { id: string; [key: string]: any };
    }
  }
}
