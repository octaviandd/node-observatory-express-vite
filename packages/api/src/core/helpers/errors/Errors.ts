import logger from "../../../../logger.js";

declare global {
  interface Error {
    statusCode?: number;
  }
}

export class AppError extends Error {
  override cause?: unknown;

  constructor(message: string, statusCode?: number, cause?: unknown) {
    super(message, { cause });
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
    this.logMessage();
  }

  logMessage() {
    logger.error("Error", {
      message: this.message,
      errorName: this.name,
      stack: this.stack,
      statusCode: this.statusCode,
      cause: this.cause ? this.cause : undefined
    })
  }
}

export class HttpError extends AppError {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode);
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not found') { super(message, 404); }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad request') { super(message, 400); }
}

export class DatabaseError extends AppError {
  constructor(message: string, public readonly cause?: unknown) {
    super(message, undefined, cause);
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message = 'Database connection failed', cause?: unknown) {
    super(message, cause);
  }
}

export class MigrationError extends DatabaseError {
  constructor(message = 'Database migration failed', cause?: unknown) {
    super(message, cause);
  }
}

export class RedisError extends AppError {
  constructor(message = 'Redis error', cause?: unknown) {
    super(message, undefined, cause)
  }
}