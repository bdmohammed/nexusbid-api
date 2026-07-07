/**
 * AppError — all expected, handled errors in the application.
 *
 * Usage:
 *   throw new AppError('Resource not found', 404, 'NOT_FOUND');
 *
 * The global errorHandler middleware catches these and returns a structured JSON response.
 * Unexpected errors (without isOperational=true) are treated as 500s.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  /** Machine-readable error code for the frontend to act on */
  public readonly code: string;
  /** Always true for AppError — distinguishes from unexpected crashes */
  public readonly isOperational: boolean = true;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    // Restore prototype chain (required when extending built-ins in TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
