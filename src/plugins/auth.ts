import { createClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { env } from '@/config/env'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import type { AuthenticatedUser } from '@/types'
import { Errors } from '@/utils/errors'

// Create Supabase client for auth
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function authPlugin(fastify: FastifyInstance) {
  // Decorate request with user (undefined as initial value)
  fastify.decorateRequest('user', undefined)

  // Authentication hook - extracts and validates JWT
  // Throws ApiError on failure, which Fastify's error handler will catch
  fastify.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    const authHeader = request.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      throw Errors.unauthorized('Missing or invalid authorization header')
    }

    const token = authHeader.substring(7)

    try {
      // Verify JWT with Supabase
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser(token)

      if (error || !authUser) {
        throw Errors.invalidToken()
      }

      // Get user from our database
      const [dbUser] = await db.select().from(users).where(eq(users.authId, authUser.id)).limit(1)

      if (!dbUser) {
        throw Errors.userNotFound()
      }

      if (!dbUser.isActive) {
        throw Errors.forbidden('User account is deactivated')
      }

      // Attach user to request
      request.user = {
        id: dbUser.id,
        authId: dbUser.authId,
        email: dbUser.email,
        accountType: dbUser.accountType,
        companyId: dbUser.companyId ?? undefined,
      } satisfies AuthenticatedUser
    } catch (err) {
      // Re-throw ApiErrors as-is
      if (err instanceof Error && err.name === 'ApiError') {
        throw err
      }
      // Log and wrap other errors
      fastify.log.error(err, 'Authentication error')
      throw Errors.internal('Authentication failed')
    }
  })

  // Optional authentication - doesn't fail if no token
  fastify.decorate('optionalAuth', async (request: FastifyRequest, _reply: FastifyReply) => {
    const authHeader = request.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      return // No token, continue without user
    }

    const token = authHeader.substring(7)

    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser(token)

      if (authUser) {
        const [dbUser] = await db.select().from(users).where(eq(users.authId, authUser.id)).limit(1)

        if (dbUser?.isActive) {
          request.user = {
            id: dbUser.id,
            authId: dbUser.authId,
            email: dbUser.email,
            accountType: dbUser.accountType,
            companyId: dbUser.companyId ?? undefined,
          }
        }
      }
    } catch {
      // Ignore errors for optional auth
    }
  })

  // Company admin check
  fastify.decorate('requireCompanyAdmin', async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw Errors.unauthorized('Authentication required')
    }

    if (request.user.accountType !== 'company' || !request.user.companyId) {
      throw Errors.forbidden('Company account required')
    }

    // TODO: Check if user is admin of the company
  })
}

// Type augmentations
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    optionalAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireCompanyAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export default fp(authPlugin, {
  name: 'auth',
})
