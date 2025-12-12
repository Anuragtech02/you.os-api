import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { RATE_LIMITS } from '@/config/constants'
import { env } from '@/config/env'

async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    cache: 10000, // Cache up to 10k keys
    allowList: [], // Add IPs to bypass if needed
    keyGenerator: (request) => {
      // Use user ID if authenticated, otherwise IP
      return request.user?.id ?? request.ip
    },
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Too many requests. Retry in ${Math.ceil(context.ttl / 1000)} seconds.`,
        details: {
          limit: context.max,
          remaining: 0,
          resetIn: context.ttl,
        },
      },
    }),
  })

  // Decorate with rate limit helpers for specific routes
  fastify.decorate('rateLimits', RATE_LIMITS)
}

// Type augmentation
declare module 'fastify' {
  interface FastifyInstance {
    rateLimits: typeof RATE_LIMITS
  }
}

export default fp(rateLimitPlugin, {
  name: 'rate-limit',
})
