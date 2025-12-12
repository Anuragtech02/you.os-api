/**
 * Test helper for creating Fastify app instances
 *
 * Uses Fastify's built-in inject() for testing without starting a server.
 * Each test gets a fresh app instance to ensure isolation.
 */

import Fastify, { type FastifyInstance } from 'fastify'
import { env } from '@/config/env'
import { authPlugin, corsPlugin, rateLimitPlugin } from '@/plugins'
import { registerRoutes } from '@/routes'

/**
 * Creates a configured Fastify instance for testing
 * Does NOT start the server - uses inject() for requests
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // Disable logging in tests
  })

  // Error handler MUST be set BEFORE plugins/routes (same as in src/index.ts)
  app.setErrorHandler((error, _request, reply) => {
    // Cast error for proper type checking
    const err = error as {
      validation?: unknown
      statusCode?: number
      code?: string
      message: string
      details?: Record<string, unknown>
    }

    // Handle validation errors
    if (err.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: err.validation,
        },
      })
    }

    // Handle known errors (including ApiError)
    if (err.statusCode) {
      return reply.status(err.statusCode).send({
        success: false,
        error: {
          code: err.code ?? 'ERROR',
          message: err.message,
          details: err.details,
        },
      })
    }

    // Unknown errors
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: env.NODE_ENV === 'production' ? 'An internal error occurred' : err.message,
      },
    })
  })

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
    })
  })

  // Register plugins AFTER error handlers
  await app.register(corsPlugin)
  await app.register(rateLimitPlugin)
  await app.register(authPlugin)

  // Register routes
  await registerRoutes(app)

  // Wait for the app to be ready
  await app.ready()

  return app
}

/**
 * Creates a minimal app with only specific plugins/routes for unit testing
 */
export async function buildMinimalApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  })

  await app.ready()

  return app
}
