import { createClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { env } from '@/config/env'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import type { AuthenticatedUser } from '@/types'
import { ErrorCodes, sendError } from '@/utils/response'

// Create Supabase client for auth
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function authPlugin(fastify: FastifyInstance) {
  // Decorate request with user (undefined as initial value)
  fastify.decorateRequest('user', undefined)

  // Authentication hook - extracts and validates JWT
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      return sendError(
        reply,
        ErrorCodes.UNAUTHORIZED,
        'Missing or invalid authorization header',
        401
      )
    }

    const token = authHeader.substring(7)

    try {
      // Verify JWT with Supabase
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser(token)

      if (error || !authUser) {
        return sendError(reply, ErrorCodes.INVALID_TOKEN, 'Invalid or expired token', 401)
      }

      // Get user from our database
      const [dbUser] = await db.select().from(users).where(eq(users.authId, authUser.id)).limit(1)

      if (!dbUser) {
        return sendError(reply, ErrorCodes.USER_NOT_FOUND, 'User not found in database', 404)
      }

      if (!dbUser.isActive) {
        return sendError(reply, ErrorCodes.FORBIDDEN, 'User account is deactivated', 403)
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
      fastify.log.error(err, 'Authentication error')
      return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Authentication failed', 500)
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
  fastify.decorate('requireCompanyAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return sendError(reply, ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    }

    if (request.user.accountType !== 'company' || !request.user.companyId) {
      return sendError(reply, ErrorCodes.FORBIDDEN, 'Company account required', 403)
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
