import type { FastifyReply } from 'fastify'
import type { ApiResponse, ResponseMeta } from '@/types'

// Success response helper
export function success<T>(data: T, meta?: ResponseMeta): ApiResponse<T> {
  return {
    success: true,
    data,
    meta,
  }
}

// Error response helper
export function error(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  }
}

// Common error codes
export const ErrorCodes = {
  // 400 Bad Request
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // 401 Unauthorized
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // 403 Forbidden
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // 404 Not Found
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // 409 Conflict
  CONFLICT: 'CONFLICT',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  SYNC_IN_PROGRESS: 'SYNC_IN_PROGRESS',

  // 429 Too Many Requests
  RATE_LIMITED: 'RATE_LIMITED',
  COOLDOWN_ACTIVE: 'COOLDOWN_ACTIVE',

  // 500 Internal Server Error
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',

  // 503 Service Unavailable
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const

// Send success response
export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  statusCode = 200,
  meta?: ResponseMeta
) {
  return reply.status(statusCode).send(success(data, meta))
}

// Send error response
export function sendError(
  reply: FastifyReply,
  code: string,
  message: string,
  statusCode = 400,
  details?: Record<string, unknown>
) {
  return reply.status(statusCode).send(error(code, message, details))
}

// Pagination helper
export function paginate<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): { data: T[]; meta: ResponseMeta } {
  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      hasMore: page * limit < total,
    },
  }
}
