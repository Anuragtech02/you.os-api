/**
 * Company Stats Service
 *
 * Dashboard statistics and metrics for company admins.
 */

import { db } from '@/db/client'
import {
  companies,
  companyCandidates,
  companyInvites,
  companyActivities,
  type CompanyActivityType,
  type CompanyActivityMetadata,
} from '@/db/schema/companies'
import { generatedContent } from '@/db/schema/content'
import { photos } from '@/db/schema/photos'
import { users } from '@/db/schema/users'
import { identityBrains } from '@/db/schema/identity-brain'
import { and, eq, gte, count, desc, sql } from 'drizzle-orm'

export interface DashboardStats {
  companyId: string
  companyName: string
  logoUrl: string | null
  totalMembers: number
  activeMembersLast7Days: number
  membersWithCompletedIdentity: number
  identityCompletionPercentage: number
  contentGenerated: {
    bios: number
    resumes: number
    total: number
  }
  membersWithPhotos: number
  membersWithBios: number
  recentJoins: Array<{
    userId: string
    name: string | null
    avatarUrl: string | null
    joinedAt: Date | null
  }>
  pendingInvitesCount: number
}

/**
 * Get dashboard statistics for a company
 */
export async function getDashboardStats(companyId: string): Promise<DashboardStats> {
  // Get company info
  const [company] = await db
    .select({ name: companies.name, logoUrl: companies.logoUrl })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)

  if (!company) {
    throw new Error('Company not found')
  }

  // Get all active members with their user info
  const members = await db
    .select({
      userId: companyCandidates.userId,
      joinedAt: companyCandidates.joinedAt,
      userName: users.fullName,
      userAvatar: users.avatarUrl,
    })
    .from(companyCandidates)
    .innerJoin(users, eq(companyCandidates.userId, users.id))
    .where(and(eq(companyCandidates.companyId, companyId), eq(companyCandidates.isActive, true)))

  const totalMembers = members.length
  const memberIds = members.map((m) => m.userId)

  // Calculate 7 days ago
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Get active members in last 7 days (those who have generated content or uploaded photos)
  let activeMembersLast7Days = 0
  if (memberIds.length > 0) {
    // Check content generation activity
    const activeFromContent = await db
      .selectDistinct({ userId: generatedContent.userId })
      .from(generatedContent)
      .where(
        and(
          sql`${generatedContent.userId} = ANY(${memberIds})`,
          gte(generatedContent.createdAt, sevenDaysAgo)
        )
      )

    // Check photo upload activity
    const activeFromPhotos = await db
      .selectDistinct({ userId: photos.userId })
      .from(photos)
      .where(and(sql`${photos.userId} = ANY(${memberIds})`, gte(photos.createdAt, sevenDaysAgo)))

    const activeUserIds = new Set([
      ...activeFromContent.map((r) => r.userId),
      ...activeFromPhotos.map((r) => r.userId),
    ])
    activeMembersLast7Days = activeUserIds.size
  }

  // Get members with completed identity brain (80%+ completion)
  let membersWithCompletedIdentity = 0
  if (memberIds.length > 0) {
    const identityBrainsData = await db
      .select({ userId: identityBrains.userId, coreAttributes: identityBrains.coreAttributes })
      .from(identityBrains)
      .where(sql`${identityBrains.userId} = ANY(${memberIds})`)

    membersWithCompletedIdentity = identityBrainsData.filter((ib) => {
      const attrs = ib.coreAttributes as Record<string, unknown>
      if (!attrs) return false
      // Check if at least 8 of the 10 main fields are filled
      const fields = [
        'name',
        'age',
        'location',
        'occupation',
        'headline',
        'shortBio',
        'interests',
        'values',
        'personality',
        'goals',
      ]
      const filled = fields.filter((f) => {
        const val = attrs[f]
        if (Array.isArray(val)) return val.length > 0
        return val !== undefined && val !== null && val !== ''
      })
      return filled.length >= 8
    }).length
  }

  const identityCompletionPercentage =
    totalMembers > 0 ? Math.round((membersWithCompletedIdentity / totalMembers) * 100) : 0

  // Get content generation stats (for company-associated content)
  const contentStats = await db
    .select({
      contentType: generatedContent.contentType,
      count: count(),
    })
    .from(generatedContent)
    .where(eq(generatedContent.companyId, companyId))
    .groupBy(generatedContent.contentType)

  const bios = contentStats.find((s) => s.contentType === 'bio')?.count ?? 0
  const resumes = contentStats.find((s) => s.contentType === 'resume')?.count ?? 0
  const totalContent = contentStats.reduce((sum, s) => sum + Number(s.count), 0)

  // Get members with photos (company-associated)
  let membersWithPhotos = 0
  if (memberIds.length > 0) {
    const usersWithPhotos = await db
      .selectDistinct({ userId: photos.userId })
      .from(photos)
      .where(sql`${photos.userId} = ANY(${memberIds})`)

    membersWithPhotos = usersWithPhotos.length
  }

  // Get members with bios
  let membersWithBios = 0
  if (memberIds.length > 0) {
    const usersWithBios = await db
      .selectDistinct({ userId: generatedContent.userId })
      .from(generatedContent)
      .where(
        and(sql`${generatedContent.userId} = ANY(${memberIds})`, eq(generatedContent.contentType, 'bio'))
      )

    membersWithBios = usersWithBios.length
  }

  // Get recent joins (last 5)
  const recentJoins = members
    .filter((m) => m.joinedAt)
    .sort((a, b) => (b.joinedAt?.getTime() ?? 0) - (a.joinedAt?.getTime() ?? 0))
    .slice(0, 5)
    .map((m) => ({
      userId: m.userId,
      name: m.userName,
      avatarUrl: m.userAvatar,
      joinedAt: m.joinedAt,
    }))

  // Get pending invites count
  const [pendingResult] = await db
    .select({ count: count() })
    .from(companyInvites)
    .where(and(eq(companyInvites.companyId, companyId), eq(companyInvites.status, 'pending')))

  const pendingInvitesCount = pendingResult?.count ?? 0

  return {
    companyId,
    companyName: company.name,
    logoUrl: company.logoUrl,
    totalMembers,
    activeMembersLast7Days,
    membersWithCompletedIdentity,
    identityCompletionPercentage,
    contentGenerated: {
      bios: Number(bios),
      resumes: Number(resumes),
      total: totalContent,
    },
    membersWithPhotos,
    membersWithBios,
    recentJoins,
    pendingInvitesCount: Number(pendingInvitesCount),
  }
}

/**
 * Log a company activity
 */
export async function logActivity(
  companyId: string,
  userId: string | null,
  type: CompanyActivityType,
  metadata: CompanyActivityMetadata = {}
): Promise<void> {
  await db.insert(companyActivities).values({
    companyId,
    userId,
    type,
    metadata,
  })
}

/**
 * Get company activity feed
 */
export async function getActivityFeed(
  companyId: string,
  options: {
    limit?: number
    offset?: number
    type?: CompanyActivityType
  } = {}
): Promise<{
  activities: Array<{
    id: string
    type: CompanyActivityType
    userId: string | null
    userName: string | null
    userAvatarUrl: string | null
    metadata: CompanyActivityMetadata
    createdAt: Date
  }>
  total: number
}> {
  const { limit = 20, offset = 0, type } = options

  const whereConditions = [eq(companyActivities.companyId, companyId)]
  if (type) {
    whereConditions.push(eq(companyActivities.type, type))
  }

  // Get total count
  const [countResult] = await db
    .select({ count: count() })
    .from(companyActivities)
    .where(and(...whereConditions))

  const total = countResult?.count ?? 0

  // Get activities with user info
  const activities = await db
    .select({
      id: companyActivities.id,
      type: companyActivities.type,
      userId: companyActivities.userId,
      metadata: companyActivities.metadata,
      createdAt: companyActivities.createdAt,
      userName: users.fullName,
      userAvatarUrl: users.avatarUrl,
    })
    .from(companyActivities)
    .leftJoin(users, eq(companyActivities.userId, users.id))
    .where(and(...whereConditions))
    .orderBy(desc(companyActivities.createdAt))
    .limit(limit)
    .offset(offset)

  return {
    activities: activities.map((a) => ({
      id: a.id,
      type: a.type as CompanyActivityType,
      userId: a.userId,
      userName: a.userName,
      userAvatarUrl: a.userAvatarUrl,
      metadata: a.metadata as CompanyActivityMetadata,
      createdAt: a.createdAt,
    })),
    total: Number(total),
  }
}
