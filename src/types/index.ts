import type { FastifyReply, FastifyRequest } from 'fastify'

// Extend FastifyRequest with authenticated user
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser
  }
}

// Authenticated user from JWT
export interface AuthenticatedUser {
  id: string
  authId: string
  email: string
  accountType: 'individual' | 'company'
  companyId?: string
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: ResponseMeta
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ResponseMeta {
  page?: number
  limit?: number
  total?: number
  hasMore?: boolean
}

// Pagination
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Common handler types
export type RouteHandler<T = unknown> = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<ApiResponse<T>>

// AI Model response types
export interface AIGenerationResult {
  content: string
  model: string
  tokensUsed: number
  costUsd: number
  embedding?: number[]
}

export interface AIAnalysisResult {
  analysis: Record<string, unknown>
  model: string
  tokensUsed: number
  costUsd: number
}

// SSE Event types
export interface SSEEvent<T = unknown> {
  event: string
  data: T
  id?: string
  retry?: number
}

export interface SyncProgressEvent {
  jobId: string
  status: 'in_progress' | 'completed' | 'failed'
  totalModules: number
  completedModules: number
  currentModule: string
  results?: Record<string, unknown>
  error?: string
}
