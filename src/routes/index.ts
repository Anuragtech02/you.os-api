import type { FastifyInstance } from 'fastify'
import { API_PREFIX } from '@/config/constants'
import { adminRoutes } from './admin'
import { aestheticRoutes } from './aesthetic'
import { authRoutes } from './auth'
import { bioRoutes } from './bios'
import { careerRoutes } from './career'
import { companyRoutes, inviteRoutes } from './companies'
import { datingRoutes } from './dating'
import { healthRoutes } from './health'
import { identityBrainRoutes } from './identity-brain'
import { photoRoutes } from './photos'
import { syncAllRoutes } from './sync-all'

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

      // Career Module routes
      await api.register(careerRoutes, { prefix: '/career' })

      // Dating Module routes
      await api.register(datingRoutes, { prefix: '/dating' })

      // Aesthetic Module routes
      await api.register(aestheticRoutes, { prefix: '/aesthetic' })

      // Sync-All routes
      await api.register(syncAllRoutes, { prefix: '/sync-all' })

      // Company routes
      await api.register(companyRoutes, { prefix: '/companies' })

      // Invite routes (public)
      await api.register(inviteRoutes, { prefix: '/invites' })

      // Admin routes (Super Admin only)
      await api.register(adminRoutes, { prefix: '/admin' })

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
