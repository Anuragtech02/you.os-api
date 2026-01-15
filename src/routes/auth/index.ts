import { createClient } from '@supabase/supabase-js'
import { and, eq, or } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { env } from '@/config/env'
import { db } from '@/db/client'
import { photos, users } from '@/db/schema'
import * as StorageService from '@/services/photos/storage'
import { ErrorCodes, sendError, sendSuccess } from '@/utils/response'
import { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from './schemas'
import * as InviteService from '@/services/admin/invites'
import * as CompanyInviteService from '@/services/companies/invites'

// Create Supabase client for auth operations
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

export async function authRoutes(fastify: FastifyInstance) {
  // =========================================
  // POST /auth/register - Create new account
  // =========================================
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = registerSchema.safeParse(request.body)

    if (!parseResult.success) {
      return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    const { email, password, fullName, inviteToken } = parseResult.data

    try {
      // Check if token is a company invite
      let companyInvite: Awaited<ReturnType<typeof CompanyInviteService.getInviteByToken>> = null
      let isCompanyInvite = false

      if (inviteToken) {
        companyInvite = await CompanyInviteService.getInviteByToken(inviteToken)
        if (companyInvite && companyInvite.status === 'pending' && new Date() < companyInvite.expiresAt) {
          isCompanyInvite = true
          // Verify email matches invite
          if (companyInvite.email.toLowerCase() !== email.toLowerCase()) {
            return sendError(
              reply,
              ErrorCodes.FORBIDDEN,
              'This invite was sent to a different email address',
              403
            )
          }
        }
      }

      // Check if invite-only mode is enabled (skip check if valid company invite)
      if (InviteService.isInviteOnlyEnabled() && !isCompanyInvite) {
        if (!inviteToken) {
          return sendError(
            reply,
            ErrorCodes.FORBIDDEN,
            'Registration is invite-only. Please provide an invite token.',
            403
          )
        }

        // Validate admin invite token
        const validation = await InviteService.validateInviteToken(inviteToken, email)
        if (!validation.valid) {
          return sendError(reply, ErrorCodes.FORBIDDEN, validation.error || 'Invalid invite token', 403)
        }
      }

      // Check if user already exists
      const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1)

      if (existingUser) {
        return sendError(reply, ErrorCodes.ALREADY_EXISTS, 'Email already registered', 409)
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm for now
      })

      if (authError || !authData.user) {
        fastify.log.error(authError, 'Supabase auth error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to create account', 500)
      }

      // Create user in our database
      const [newUser] = await db
        .insert(users)
        .values({
          authId: authData.user.id,
          email,
          fullName,
        })
        .returning()

      if (!newUser) {
        fastify.log.error('Failed to create user in database')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to create account', 500)
      }

      // Mark admin invite token as used (if applicable)
      if (inviteToken && InviteService.isInviteOnlyEnabled() && !isCompanyInvite) {
        await InviteService.useInviteToken(inviteToken)
      }

      // Auto-accept company invite if registering with company invite token
      let companyInfo: { companyId: string; role: string } | null = null
      if (isCompanyInvite && companyInvite) {
        try {
          const { companyId } = await CompanyInviteService.acceptInvite(inviteToken!, newUser.id)
          companyInfo = { companyId, role: companyInvite.role }

          // If role is owner or admin, update user's accountType to 'company'
          if (companyInvite.role === 'owner' || companyInvite.role === 'admin') {
            await db
              .update(users)
              .set({
                accountType: 'company',
                companyId,
              })
              .where(eq(users.id, newUser.id))
            newUser.accountType = 'company'
            newUser.companyId = companyId
          }
        } catch (err) {
          fastify.log.error(err, 'Failed to auto-accept company invite')
          // Don't fail registration, user can accept manually later
        }
      }

      // Sign in the user to get tokens
      const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError || !session.session) {
        // User created but couldn't sign in - still return success
        return sendSuccess(
          reply,
          {
            user: {
              id: newUser.id,
              email: newUser.email,
              fullName: newUser.fullName,
              accountType: newUser.accountType,
              companyId: newUser.companyId,
            },
            company: companyInfo,
            message: 'Account created. Please sign in.',
          },
          201
        )
      }

      return sendSuccess(
        reply,
        {
          user: {
            id: newUser.id,
            email: newUser.email,
            fullName: newUser.fullName,
            accountType: newUser.accountType,
            companyId: newUser.companyId,
          },
          company: companyInfo,
          session: {
            accessToken: session.session.access_token,
            refreshToken: session.session.refresh_token,
            expiresAt: session.session.expires_at,
          },
        },
        201
      )
    } catch (error) {
      fastify.log.error(error, 'Register error')
      return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to create account', 500)
    }
  })

  // =========================================
  // GET /auth/invite/:token - Validate invite token (public)
  // =========================================
  fastify.get<{ Params: { token: string } }>(
    '/invite/:token',
    async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
      const { token } = request.params

      if (!token || token.length < 3) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid invite token', 400)
      }

      try {
        const validation = await InviteService.validateInviteToken(token)

        if (!validation.valid) {
          return sendError(reply, ErrorCodes.NOT_FOUND, validation.error || 'Invalid invite token', 404)
        }

        const invite = validation.invite!

        return sendSuccess(reply, {
          valid: true,
          invite: {
            // Only expose safe information
            restrictedToEmail: invite.email || null,
            expiresAt: invite.expiresAt,
            remainingUses: parseInt(invite.maxUses, 10) - parseInt(invite.usedCount, 10),
            note: invite.note, // Optional: could hide this for privacy
          },
          inviteOnlyEnabled: InviteService.isInviteOnlyEnabled(),
        })
      } catch (error) {
        fastify.log.error(error, 'Validate invite token error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to validate invite token', 500)
      }
    }
  )

  // =========================================
  // POST /auth/login - Sign in
  // =========================================
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = loginSchema.safeParse(request.body)

    if (!parseResult.success) {
      return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    const { email, password } = parseResult.data

    try {
      // Sign in with Supabase
      const { data: session, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          return sendError(reply, ErrorCodes.UNAUTHORIZED, 'Invalid email or password', 401)
        }
        fastify.log.error(authError, 'Login error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Login failed', 500)
      }

      if (!session.session || !session.user) {
        return sendError(reply, ErrorCodes.UNAUTHORIZED, 'Invalid email or password', 401)
      }

      // Get user from our database
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.authId, session.user.id))
        .limit(1)

      if (!dbUser) {
        // User exists in Supabase but not in our DB - create them
        const [newUser] = await db
          .insert(users)
          .values({
            authId: session.user.id,
            email: session.user.email!,
            fullName: session.user.user_metadata?.full_name,
          })
          .returning()

        if (!newUser) {
          fastify.log.error('Failed to create user in database during login')
          return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Login failed', 500)
        }

        return sendSuccess(reply, {
          user: {
            id: newUser.id,
            email: newUser.email,
            fullName: newUser.fullName,
            accountType: newUser.accountType,
          },
          session: {
            accessToken: session.session.access_token,
            refreshToken: session.session.refresh_token,
            expiresAt: session.session.expires_at,
          },
        })
      }

      if (!dbUser.isActive) {
        return sendError(reply, ErrorCodes.FORBIDDEN, 'Account is deactivated', 403)
      }

      return sendSuccess(reply, {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          accountType: dbUser.accountType,
          avatarUrl: dbUser.avatarUrl,
        },
        session: {
          accessToken: session.session.access_token,
          refreshToken: session.session.refresh_token,
          expiresAt: session.session.expires_at,
        },
      })
    } catch (error) {
      fastify.log.error(error, 'Login error')
      return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Login failed', 500)
    }
  })

  // =========================================
  // POST /auth/logout - Sign out
  // =========================================
  fastify.post(
    '/logout',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = request.headers.authorization
        const token = authHeader?.substring(7)

        if (token) {
          // Sign out from Supabase
          await supabase.auth.admin.signOut(token)
        }

        return sendSuccess(reply, { message: 'Logged out successfully' })
      } catch (error) {
        fastify.log.error(error, 'Logout error')
        // Still return success - user intent is to log out
        return sendSuccess(reply, { message: 'Logged out successfully' })
      }
    }
  )

  // =========================================
  // POST /auth/refresh - Refresh token
  // =========================================
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as { refreshToken?: string }

    if (!refreshToken) {
      return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Refresh token is required', 400)
    }

    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      })

      if (error || !data.session) {
        return sendError(reply, ErrorCodes.INVALID_TOKEN, 'Invalid or expired refresh token', 401)
      }

      return sendSuccess(reply, {
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
        },
      })
    } catch (error) {
      fastify.log.error(error, 'Refresh token error')
      return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to refresh token', 500)
    }
  })

  // =========================================
  // GET /auth/me - Get current user
  // =========================================
  fastify.get(
    '/me',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const [user] = await db.select().from(users).where(eq(users.id, request.user!.id)).limit(1)

        if (!user) {
          return sendError(reply, ErrorCodes.USER_NOT_FOUND, 'User not found', 404)
        }

        // Look up avatar photo and get signed URL if user has an avatarUrl
        let avatarPhotoId: string | null = null
        let avatarSignedUrl: string | null = null
        if (user.avatarUrl) {
          // Avatar could be original or enhanced URL, check both
          const [avatarPhoto] = await db
            .select({ id: photos.id, storagePath: photos.storagePath, originalUrl: photos.originalUrl, enhancedUrl: photos.enhancedUrl })
            .from(photos)
            .where(and(
              eq(photos.userId, user.id),
              or(eq(photos.originalUrl, user.avatarUrl), eq(photos.enhancedUrl, user.avatarUrl))
            ))
            .limit(1)
          avatarPhotoId = avatarPhoto?.id ?? null

          // Get signed URL for avatar
          if (avatarPhoto) {
            try {
              // Determine which URL is being used and get appropriate signed URL
              const isEnhanced = user.avatarUrl === avatarPhoto.enhancedUrl
              if (isEnhanced && avatarPhoto.enhancedUrl) {
                // Extract path from enhanced URL and sign it
                const enhancedPath = StorageService.extractStoragePathFromUrl(avatarPhoto.enhancedUrl)
                if (enhancedPath) {
                  avatarSignedUrl = await StorageService.getSignedUrl(enhancedPath)
                }
              } else {
                // Use original storage path
                avatarSignedUrl = await StorageService.getSignedUrl(avatarPhoto.storagePath)
              }
            } catch {
              // Fall back to original URL if signing fails
              avatarSignedUrl = user.avatarUrl
            }
          }
        }

        return sendSuccess(reply, {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: avatarSignedUrl ?? user.avatarUrl,
            avatarPhotoId,
            accountType: user.accountType,
            companyId: user.companyId,
            preferences: user.preferences,
            createdAt: user.createdAt,
          },
        })
      } catch (error) {
        fastify.log.error(error, 'Get user error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to get user', 500)
      }
    }
  )

  // =========================================
  // PATCH /auth/me - Update profile
  // =========================================
  fastify.patch(
    '/me',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = updateProfileSchema.safeParse(request.body)

      if (!parseResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      }

      const updates = parseResult.data

      try {
        const [updatedUser] = await db
          .update(users)
          .set({
            ...(updates.fullName !== undefined && { fullName: updates.fullName }),
            ...(updates.avatarUrl !== undefined && { avatarUrl: updates.avatarUrl }),
            ...(updates.preferences !== undefined && { preferences: updates.preferences }),
          })
          .where(eq(users.id, request.user!.id))
          .returning()

        if (!updatedUser) {
          return sendError(reply, ErrorCodes.USER_NOT_FOUND, 'User not found', 404)
        }

        // Get signed URL for avatar if it exists
        let avatarSignedUrl: string | null = null
        if (updatedUser.avatarUrl) {
          // Avatar could be original or enhanced URL, check both
          const [avatarPhoto] = await db
            .select({ storagePath: photos.storagePath, originalUrl: photos.originalUrl, enhancedUrl: photos.enhancedUrl })
            .from(photos)
            .where(and(
              eq(photos.userId, updatedUser.id),
              or(eq(photos.originalUrl, updatedUser.avatarUrl), eq(photos.enhancedUrl, updatedUser.avatarUrl))
            ))
            .limit(1)

          if (avatarPhoto) {
            try {
              const isEnhanced = updatedUser.avatarUrl === avatarPhoto.enhancedUrl
              if (isEnhanced && avatarPhoto.enhancedUrl) {
                const enhancedPath = StorageService.extractStoragePathFromUrl(avatarPhoto.enhancedUrl)
                if (enhancedPath) {
                  avatarSignedUrl = await StorageService.getSignedUrl(enhancedPath)
                }
              } else {
                avatarSignedUrl = await StorageService.getSignedUrl(avatarPhoto.storagePath)
              }
            } catch {
              avatarSignedUrl = updatedUser.avatarUrl
            }
          }
        }

        return sendSuccess(reply, {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            fullName: updatedUser.fullName,
            avatarUrl: avatarSignedUrl ?? updatedUser.avatarUrl,
            accountType: updatedUser.accountType,
            preferences: updatedUser.preferences,
          },
        })
      } catch (error) {
        fastify.log.error(error, 'Update profile error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to update profile', 500)
      }
    }
  )

  // =========================================
  // POST /auth/change-password - Change password
  // =========================================
  fastify.post(
    '/change-password',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = changePasswordSchema.safeParse(request.body)

      if (!parseResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      }

      const { currentPassword, newPassword } = parseResult.data

      try {
        // Verify current password by attempting to sign in
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: request.user!.email,
          password: currentPassword,
        })

        if (verifyError) {
          return sendError(reply, ErrorCodes.UNAUTHORIZED, 'Current password is incorrect', 401)
        }

        // Update password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          request.user!.authId,
          { password: newPassword }
        )

        if (updateError) {
          fastify.log.error(updateError, 'Password update error')
          return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to change password', 500)
        }

        return sendSuccess(reply, { message: 'Password changed successfully' })
      } catch (error) {
        fastify.log.error(error, 'Change password error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to change password', 500)
      }
    }
  )
}
