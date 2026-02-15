import logger from "../../../logger.js";

declare global {
  interface Error {
    statusCode?: number;
  }
}

export class AppError extends Error {
  constructor(message: string, statusCode?: number, cause?: Error | string) {
    super(message, { cause: cause instanceof Error ? cause : new Error(cause) });
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
    this.logMessage();
  }

  logMessage() {
    const causeError = this.cause as Error | undefined;
    console.log(causeError)
    logger.error("Error", {
      message: this.message,
      errorName: this.name,
      stack: this.stack,
      statusCode: this.statusCode,
      cause: causeError ? this.serializeError(causeError) : undefined
    })
  }

  private serializeError(error?: unknown): object | undefined {
    if (!error) return undefined;
    
    if (error instanceof Error) {
      // Get all enumerable properties (includes code, errno, sql, etc.)
      const errorObj: Record<string, any> = {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
      
      // Copy all additional properties (like code, errno, sql, sqlState, sqlMessage)
      for (const key of Object.keys(error)) {
        if (!(key in errorObj)) {
          errorObj[key] = (error as any)[key];
        }
      }
      
      return errorObj;
    }
    
    // If it's not an Error, just return it as-is
    return { value: String(error) };
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
  constructor(message: string, public readonly cause?: Error | string) {
    super(message, undefined, cause);
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message = 'Database connection failed', {cause} : {cause: Error | string}) {
    super(message, cause);
  }
}

export class MigrationError extends DatabaseError {
  constructor(message = 'Database migration failed', {cause} : {cause: Error | string}) {
    super(message, cause);
  }
}

export class RedisError extends AppError {
  constructor(message = 'Redis error', { cause } : {cause?: Error | string}) {
    super(message, undefined, cause)
  }
}

export class DatabaseRetrieveError extends DatabaseError {
  constructor(message = 'Database retrieve error', { cause } : {cause?: Error | string}) {
    super(message, cause)
  }
}