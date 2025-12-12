/**
 * Custom API Error class for controlled error responses
 *
 * Use this in preHandlers and route handlers to throw errors
 * that will be caught by Fastify's error handler.
 */

export class ApiError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: Record<string, unknown>

  constructor(
    code: string,
    message: string,
    statusCode = 400,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
    this.details = details

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor)
  }
}

// Convenience factory functions
export const Errors = {
  unauthorized: (message = 'Unauthorized') =>
    new ApiError('UNAUTHORIZED', message, 401),

  invalidToken: (message = 'Invalid or expired token') =>
    new ApiError('INVALID_TOKEN', message, 401),

  forbidden: (message = 'Forbidden') =>
    new ApiError('FORBIDDEN', message, 403),

  notFound: (resource = 'Resource', message?: string) =>
    new ApiError('NOT_FOUND', message ?? `${resource} not found`, 404),

  userNotFound: () =>
    new ApiError('USER_NOT_FOUND', 'User not found', 404),

  validation: (message: string, details?: Record<string, unknown>) =>
    new ApiError('VALIDATION_ERROR', message, 400, details),

  conflict: (message: string) =>
    new ApiError('CONFLICT', message, 409),

  alreadyExists: (resource = 'Resource') =>
    new ApiError('ALREADY_EXISTS', `${resource} already exists`, 409),

  internal: (message = 'An internal error occurred') =>
    new ApiError('INTERNAL_ERROR', message, 500),

  rateLimited: (message = 'Too many requests') =>
    new ApiError('RATE_LIMITED', message, 429),
}
