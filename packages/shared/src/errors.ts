/**
 * Structured application error used across the API and domain layers.
 * Maps to the error response shape: { error: { code, message, details?, requestId } }
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    code: string,
    statusCode: number,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    // Maintain prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// Common error factories
// ---------------------------------------------------------------------------

export const Errors = {
  validation: (message: string, details?: unknown) =>
    new AppError('VALIDATION', 422, message, details),

  notFound: (message = 'Resource not found') =>
    new AppError('NOT_FOUND', 404, message),

  unauthorized: (message = 'Authentication required') =>
    new AppError('UNAUTHORIZED', 401, message),

  forbidden: (message = 'Insufficient permissions') =>
    new AppError('FORBIDDEN', 403, message),

  conflict: (message: string, details?: unknown) =>
    new AppError('CONFLICT', 409, message, details),

  rateLimited: (message = 'Too many requests') =>
    new AppError('RATE_LIMITED', 429, message),
} as const;
