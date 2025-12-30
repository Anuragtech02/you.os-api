/**
 * Signup Invite Service
 *
 * Manages invite tokens for invite-only registration.
 */

import { and, count, desc, eq, gt, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '@/db/client'
import { signupInviteTokens, type SignupInviteToken } from '@/db/schema'
import { ApiError } from '@/utils/errors'
import { ErrorCodes } from '@/utils/response'
import * as EmailService from '@/services/email'

/**
 * Create a new signup invite token
 */
export async function createInviteToken(options: {
  email?: string
  maxUses?: number
  expiresInDays?: number
  note?: string
  createdBy?: string
  sendEmail?: boolean
}): Promise<SignupInviteToken> {
  const { email, maxUses = 1, expiresInDays = 7, note, createdBy, sendEmail = true } = options

  // Generate unique token
  const token = nanoid(32)

  // Calculate expiration
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const [invite] = await db
    .insert(signupInviteTokens)
    .values({
      token,
      email: email || null,
      maxUses: String(maxUses),
      usedCount: '0',
      expiresAt,
      note,
      createdBy,
    })
    .returning()

  if (!invite) {
    throw new ApiError(ErrorCodes.INTERNAL_ERROR, 'Failed to create invite token', 500)
  }

  // Send invite email if email is provided and sendEmail is true
  if (email && sendEmail) {
    try {
      await EmailService.sendSignupInviteEmail({
        email,
        token,
        expiresAt,
        note: note || undefined,
      })
    } catch (err) {
      // Log error but don't fail the invite creation
      console.error('[SignupInvite] Failed to send invite email:', err)
    }
  }

  return invite
}

/**
 * Validate an invite token for registration
 */
export async function validateInviteToken(
  token: string,
  email?: string
): Promise<{ valid: boolean; error?: string; invite?: SignupInviteToken }> {
  const [invite] = await db
    .select()
    .from(signupInviteTokens)
    .where(and(eq(signupInviteTokens.token, token), eq(signupInviteTokens.isActive, true)))
    .limit(1)

  if (!invite) {
    return { valid: false, error: 'Invalid invite token' }
  }

  // Check expiration
  if (new Date() > invite.expiresAt) {
    return { valid: false, error: 'Invite token has expired' }
  }

  // Check usage limit
  const usedCount = parseInt(invite.usedCount, 10)
  const maxUses = parseInt(invite.maxUses, 10)
  if (usedCount >= maxUses) {
    return { valid: false, error: 'Invite token has reached its usage limit' }
  }

  // Check email restriction if set
  if (invite.email && email && invite.email.toLowerCase() !== email.toLowerCase()) {
    return { valid: false, error: 'This invite token is restricted to a different email' }
  }

  return { valid: true, invite }
}

/**
 * Use an invite token (increment usage count)
 */
export async function useInviteToken(token: string): Promise<void> {
  await db
    .update(signupInviteTokens)
    .set({
      usedCount: sql`(${signupInviteTokens.usedCount}::int + 1)::text`,
    })
    .where(eq(signupInviteTokens.token, token))
}

/**
 * List all invite tokens
 */
export async function listInviteTokens(options: {
  limit?: number
  offset?: number
  includeExpired?: boolean
}): Promise<{ invites: SignupInviteToken[]; total: number }> {
  const { limit = 50, offset = 0, includeExpired = false } = options

  const conditions = [eq(signupInviteTokens.isActive, true)]

  if (!includeExpired) {
    conditions.push(gt(signupInviteTokens.expiresAt, new Date()))
  }

  const invites = await db
    .select()
    .from(signupInviteTokens)
    .where(and(...conditions))
    .orderBy(desc(signupInviteTokens.createdAt))
    .limit(limit)
    .offset(offset)

  const totalResult = await db
    .select({ value: count() })
    .from(signupInviteTokens)
    .where(and(...conditions))

  const total = totalResult[0]?.value ?? 0

  return { invites, total }
}

/**
 * Revoke an invite token
 */
export async function revokeInviteToken(tokenId: string): Promise<void> {
  const [updated] = await db
    .update(signupInviteTokens)
    .set({ isActive: false })
    .where(eq(signupInviteTokens.id, tokenId))
    .returning()

  if (!updated) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'Invite token not found', 404)
  }
}

/**
 * Get invite token by ID
 */
export async function getInviteTokenById(id: string): Promise<SignupInviteToken | null> {
  const [invite] = await db
    .select()
    .from(signupInviteTokens)
    .where(eq(signupInviteTokens.id, id))
    .limit(1)

  return invite || null
}

/**
 * Check if invite-only mode is enabled
 * This checks for a system setting or environment variable
 */
export function isInviteOnlyEnabled(): boolean {
  // Check environment variable
  const envValue = process.env.INVITE_ONLY_REGISTRATION
  return envValue === 'true' || envValue === '1'
}
