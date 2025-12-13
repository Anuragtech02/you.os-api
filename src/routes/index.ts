import type { FastifyInstance } from 'fastify'
import { API_PREFIX } from '@/config/constants'
import { authRoutes } from './auth'
import { bioRoutes } from './bios'
import { healthRoutes } from './health'
import { identityBrainRoutes } from './identity-brain'
import { photoRoutes } from './photos'

export async function registerRoutes(fastify: FastifyInstance) {
  // Health routes (no prefix)
  await fastify.register(healthRoutes)

  // API routes with version prefix
  await fastify.register(
    async (api) => {
      // Auth routes
      await api.register(authRoutes, { prefix: '/auth' })

      // Identity Brain routes
      await api.register(identityBrainRoutes, { prefix: '/identity-brain' })

      // Photo routes
      await api.register(photoRoutes, { prefix: '/photos' })

      // Bio Generator routes
      await api.register(bioRoutes, { prefix: '/bios' })

      // TODO: Register additional API route modules here
      // await api.register(syncRoutes, { prefix: '/sync-all' })
      // await api.register(moduleRoutes, { prefix: '/modules' })

      // Placeholder route
      api.get('/', async () => ({
        success: true,
        data: {
          message: 'YOU.OS API',
          version: 'v1',
          docs: '/docs',
        },
      }))
    },
    { prefix: API_PREFIX }
  )
}
