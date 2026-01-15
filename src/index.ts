import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { env } from '@/config/env'
import { authPlugin, billingPlugin, corsPlugin, rateLimitPlugin } from '@/plugins'
import { registerRoutes } from '@/routes'
import { logger } from '@/utils'

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
  trustProxy: true,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'requestId',
  disableRequestLogging: true, // We'll handle request logging manually
})

// Register plugins
async function registerPlugins() {
  await fastify.register(corsPlugin)
  await fastify.register(rateLimitPlugin)
  await fastify.register(authPlugin)
  await fastify.register(billingPlugin)
  // Multipart for file uploads (10MB limit)
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
    },
  })
  // Custom content type parser for Stripe webhooks (raw body as Buffer)
  // This captures the raw body for signature verification
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      // Store raw body for webhook signature verification
      ;(req as typeof req & { rawBody: Buffer }).rawBody = body as Buffer
      try {
        const json = JSON.parse(body.toString())
        done(null, json)
      } catch (err) {
        done(err as Error, undefined)
      }
    }
  )
}

// Custom request logging - skip health checks unless LOG_HEALTH_CHECKS=true
const isHealthCheck = (url: string) => url === '/health' || url.startsWith('/health')

fastify.addHook('onRequest', (request, _reply, done) => {
  if (!env.LOG_HEALTH_CHECKS && isHealthCheck(request.url)) {
    done()
    return
  }
  request.log.info({ req: request }, 'incoming request')
  done()
})

fastify.addHook('onResponse', (request, reply, done) => {
  if (!env.LOG_HEALTH_CHECKS && isHealthCheck(request.url)) {
    done()
    return
  }
  request.log.info(
    { res: reply, responseTime: reply.elapsedTime },
    'request completed'
  )
  done()
})

// Register routes
async function setupRoutes() {
  await registerRoutes(fastify)
}

// Error handler
fastify.setErrorHandler((error, _request, reply) => {
  fastify.log.error(error)

  // Cast error to FastifyError for proper type checking
  const err = error as { validation?: unknown; statusCode?: number; code?: string; message: string }

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

  // Handle known errors
  if (err.statusCode) {
    return reply.status(err.statusCode).send({
      success: false,
      error: {
        code: err.code ?? 'ERROR',
        message: err.message,
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
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
    },
  })
})

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down server...')
  await fastify.close()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// Start server
async function start() {
  try {
    await registerPlugins()
    await setupRoutes()

    await fastify.listen({
      port: env.PORT,
      host: env.HOST,
    })

    logger.info(`🚀 YOU.OS API running on http://${env.HOST}:${env.PORT}`)
    logger.info(`📚 Environment: ${env.NODE_ENV}`)
  } catch (error) {
    logger.error('Failed to start server', error)
    process.exit(1)
  }
}

start()
