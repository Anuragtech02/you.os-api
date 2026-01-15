/**
 * Company Invite Service
 *
 * Manages employee invitations to companies.
 */

import { db } from '@/db/client'
import { companyInvites, companyCandidates, companies, type CompanyInvite } from '@/db/schema/companies'
import { users } from '@/db/schema/users'
import { eq, and, gt, desc } from 'drizzle-orm'
import { ApiError } from '@/utils/errors'
import { randomBytes } from 'crypto'
import * as EmailService from '@/services/email'
import { logActivity } from './stats'

// Invite expiration: 7 days
const INVITE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000

export interface InviteWithDetails {
  id: string
  email: string
  role: string
  status: string
  token: string
  expiresAt: Date
  invitedBy: string
  inviterName: string | null
  createdAt: Date
}

/**
 * Generate a secure invite token
 */
function generateToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Send an invite to join a company
 */
export async function sendInvite(
  companyId: string,
  invitedBy: string,
  data: {
    email: string
    role?: string
  }
): Promise<CompanyInvite> {
  const email = data.email.toLowerCase().trim()

  // Check if already a pending invite exists
  const [existingInvite] = await db
    .select()
    .from(companyInvites)
    .where(
      and(
        eq(companyInvites.companyId, companyId),
        eq(companyInvites.email, email),
        eq(companyInvites.status, 'pending'),
        gt(companyInvites.expiresAt, new Date())
      )
    )
    .limit(1)

  if (existingInvite) {
    throw new ApiError('CONFLICT', 'An invite for this email is already pending', 409)
  }

  // Check if user is already a member
  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)

  if (existingUser) {
    const [membership] = await db
      .select()
      .from(companyCandidates)
      .where(
        and(
          eq(companyCandidates.companyId, companyId),
          eq(companyCandidates.userId, existingUser.id),
          eq(companyCandidates.isActive, true)
        )
      )
      .limit(1)

    if (membership) {
      throw new ApiError('CONFLICT', 'User is already a member of this company', 409)
    }
  }

  // Create the invite
  const token = generateToken()
  const expiresAt = new Date(Date.now() + INVITE_EXPIRATION_MS)

  const [invite] = await db
    .insert(companyInvites)
    .values({
      companyId,
      email,
      role: data.role || 'employee',
      token,
      expiresAt,
      invitedBy,
    })
    .returning()

  // Send invite email
  try {
    // Get company and inviter info for email
    const [company] = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, companyId)).limit(1)
    const [inviter] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, invitedBy)).limit(1)

    await EmailService.sendCompanyInviteEmail({
      email,
      companyName: company?.name || 'the company',
      inviterName: inviter?.fullName || 'A team member',
      role: data.role || 'employee',
      token,
      expiresAt,
    })
  } catch (err) {
    // Log error but don't fail the invite creation
    console.error('[CompanyInvite] Failed to send invite email:', err)
  }

  return invite!
}

/**
 * Get invite by token
 */
export async function getInviteByToken(token: string): Promise<CompanyInvite | null> {
  const [invite] = await db.select().from(companyInvites).where(eq(companyInvites.token, token)).limit(1)

  return invite || null
}

/**
 * Accept an invite
 */
export async function acceptInvite(
  token: string,
  userId: string
): Promise<{ invite: CompanyInvite; companyId: string }> {
  const invite = await getInviteByToken(token)

  if (!invite) {
    throw new ApiError('NOT_FOUND', 'Invite not found', 404)
  }

  if (invite.status !== 'pending') {
    throw new ApiError('VALIDATION_ERROR', `Invite has already been ${invite.status}`, 400)
  }

  if (new Date() > invite.expiresAt) {
    // Mark as expired
    await db.update(companyInvites).set({ status: 'expired' }).where(eq(companyInvites.id, invite.id))
    throw new ApiError('VALIDATION_ERROR', 'Invite has expired', 400)
  }

  // Verify user email matches invite email
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)

  if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new ApiError('FORBIDDEN', 'This invite was sent to a different email address', 403)
  }

  // Check if already a member (race condition protection)
  const [existing] = await db
    .select()
    .from(companyCandidates)
    .where(
      and(
        eq(companyCandidates.companyId, invite.companyId),
        eq(companyCandidates.userId, userId),
        eq(companyCandidates.isActive, true)
      )
    )
    .limit(1)

  if (existing) {
    // Mark invite as accepted anyway
    await db
      .update(companyInvites)
      .set({ status: 'accepted', acceptedBy: userId, acceptedAt: new Date() })
      .where(eq(companyInvites.id, invite.id))

    return { invite, companyId: invite.companyId }
  }

  // Add user to company
  await db.insert(companyCandidates).values({
    companyId: invite.companyId,
    userId,
    role: invite.role,
    invitedAt: invite.createdAt,
    joinedAt: new Date(),
  })

  // If role is owner or admin, update user's accountType to 'company'
  if (invite.role === 'owner' || invite.role === 'admin') {
    await db
      .update(users)
      .set({
        accountType: 'company',
        companyId: invite.companyId,
      })
      .where(eq(users.id, userId))
  }

  // Mark invite as accepted
  const [acceptedInvite] = await db
    .update(companyInvites)
    .set({ status: 'accepted', acceptedBy: userId, acceptedAt: new Date() })
    .where(eq(companyInvites.id, invite.id))
    .returning()

  // Log member joined activity
  try {
    await logActivity(invite.companyId, userId, 'member_joined', {
      userName: user.email,
    })
  } catch (err) {
    console.error('[CompanyInvite] Failed to log activity:', err)
  }

  return { invite: acceptedInvite!, companyId: invite.companyId }
}

/**
 * List invites for a company
 */
export async function listInvites(
  companyId: string,
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<{ invites: InviteWithDetails[]; total: number }> {
  const { status, limit = 50, offset = 0 } = options

  let query = db
    .select({
      id: companyInvites.id,
      email: companyInvites.email,
      role: companyInvites.role,
      status: companyInvites.status,
      token: companyInvites.token,
      expiresAt: companyInvites.expiresAt,
      invitedBy: companyInvites.invitedBy,
      inviterName: users.fullName,
      createdAt: companyInvites.createdAt,
    })
    .from(companyInvites)
    .innerJoin(users, eq(users.id, companyInvites.invitedBy))
    .where(eq(companyInvites.companyId, companyId))
    .orderBy(desc(companyInvites.createdAt))
    .limit(limit)
    .offset(offset)

  const invites = await query

  // Filter by status if provided
  const filteredInvites = status ? invites.filter((i) => i.status === status) : invites

  // Get total count
  const allInvites = await db
    .select({ id: companyInvites.id, status: companyInvites.status })
    .from(companyInvites)
    .where(eq(companyInvites.companyId, companyId))

  const total = status ? allInvites.filter((i) => i.status === status).length : allInvites.length

  return {
    invites: filteredInvites,
    total,
  }
}

/**
 * Revoke an invite
 */
export async function revokeInvite(companyId: string, inviteId: string): Promise<void> {
  const [invite] = await db
    .select()
    .from(companyInvites)
    .where(and(eq(companyInvites.id, inviteId), eq(companyInvites.companyId, companyId)))
    .limit(1)

  if (!invite) {
    throw new ApiError('NOT_FOUND', 'Invite not found', 404)
  }

  if (invite.status !== 'pending') {
    throw new ApiError('VALIDATION_ERROR', `Cannot revoke invite that is ${invite.status}`, 400)
  }

  await db.update(companyInvites).set({ status: 'revoked' }).where(eq(companyInvites.id, inviteId))
}

/**
 * Resend an invite
 */
export async function resendInvite(companyId: string, inviteId: string): Promise<CompanyInvite> {
  const [invite] = await db
    .select()
    .from(companyInvites)
    .where(and(eq(companyInvites.id, inviteId), eq(companyInvites.companyId, companyId)))
    .limit(1)

  if (!invite) {
    throw new ApiError('NOT_FOUND', 'Invite not found', 404)
  }

  if (invite.status === 'accepted') {
    throw new ApiError('VALIDATION_ERROR', 'Invite has already been accepted', 400)
  }

  // Generate new token and extend expiration
  const token = generateToken()
  const expiresAt = new Date(Date.now() + INVITE_EXPIRATION_MS)

  const [updatedInvite] = await db
    .update(companyInvites)
    .set({ token, expiresAt, status: 'pending' })
    .where(eq(companyInvites.id, inviteId))
    .returning()

  // Send invite email
  try {
    // Get company and inviter info for email
    const [company] = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, companyId)).limit(1)
    const [inviter] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, invite.invitedBy)).limit(1)

    await EmailService.sendCompanyInviteEmail({
      email: invite.email,
      companyName: company?.name || 'the company',
      inviterName: inviter?.fullName || 'A team member',
      role: invite.role,
      token,
      expiresAt,
    })
  } catch (err) {
    // Log error but don't fail the resend
    console.error('[CompanyInvite] Failed to resend invite email:', err)
  }

  return updatedInvite!
}
