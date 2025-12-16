/**
 * Company Service
 *
 * Core CRUD operations for company accounts.
 */

import { db } from '@/db/client'
import {
  companies,
  companyCandidates,
  type Company,
} from '@/db/schema/companies'
import { eq, and } from 'drizzle-orm'
import { ApiError } from '@/utils/errors'

/**
 * Create a new company
 */
export async function createCompany(
  ownerId: string,
  data: {
    name: string
    slug?: string
    domain?: string
    logoUrl?: string
  }
): Promise<Company> {
  // Generate slug from name if not provided
  let slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  // Check if slug is taken (including inactive companies due to unique constraint)
  const [existing] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.slug, slug))
    .limit(1)

  if (existing) {
    // Append a random suffix to make the slug unique
    slug = `${slug}-${Date.now().toString(36)}`
  }

  const [company] = await db
    .insert(companies)
    .values({
      name: data.name,
      slug,
      domain: data.domain,
      logoUrl: data.logoUrl,
      ownerId,
    })
    .returning()

  // Add owner as admin member
  await db.insert(companyCandidates).values({
    companyId: company!.id,
    userId: ownerId,
    role: 'admin',
    joinedAt: new Date(),
  })

  return company!
}

/**
 * Get company by ID
 */
export async function getCompanyById(companyId: string): Promise<Company | null> {
  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, companyId), eq(companies.isActive, true)))
    .limit(1)

  return company || null
}

/**
 * Get company by slug
 */
export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.slug, slug), eq(companies.isActive, true)))
    .limit(1)

  return company || null
}

/**
 * Get companies for a user (as owner or member)
 */
export async function getUserCompanies(userId: string): Promise<Company[]> {
  // Get companies where user is a member
  const memberships = await db
    .select({ companyId: companyCandidates.companyId })
    .from(companyCandidates)
    .where(and(eq(companyCandidates.userId, userId), eq(companyCandidates.isActive, true)))

  if (memberships.length === 0) {
    return []
  }

  const companyIds = memberships.map((m) => m.companyId)

  // Get the actual company records
  const userCompanies: Company[] = []
  for (const companyId of companyIds) {
    const company = await getCompanyById(companyId)
    if (company) {
      userCompanies.push(company)
    }
  }

  return userCompanies
}

/**
 * Update company
 */
export async function updateCompany(
  companyId: string,
  data: {
    name?: string
    domain?: string
    logoUrl?: string
    brandColors?: { primary?: string; secondary?: string; accent?: string }
    settings?: Record<string, unknown>
  }
): Promise<Company> {
  const updateData: Partial<Company> = {
    updatedAt: new Date(),
  }

  if (data.name !== undefined) updateData.name = data.name
  if (data.domain !== undefined) updateData.domain = data.domain
  if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl
  if (data.brandColors !== undefined) updateData.brandColors = data.brandColors
  if (data.settings !== undefined) updateData.settings = data.settings as any

  const [company] = await db
    .update(companies)
    .set(updateData)
    .where(eq(companies.id, companyId))
    .returning()

  if (!company) {
    throw new ApiError('NOT_FOUND', 'Company not found', 404)
  }

  return company
}

/**
 * Soft delete company
 */
export async function deleteCompany(companyId: string): Promise<void> {
  await db.update(companies).set({ isActive: false, updatedAt: new Date() }).where(eq(companies.id, companyId))
}

/**
 * Check if user has role in company
 */
export async function getUserRoleInCompany(
  userId: string,
  companyId: string
): Promise<{ role: string; isOwner: boolean } | null> {
  const [membership] = await db
    .select({
      role: companyCandidates.role,
    })
    .from(companyCandidates)
    .where(
      and(
        eq(companyCandidates.userId, userId),
        eq(companyCandidates.companyId, companyId),
        eq(companyCandidates.isActive, true)
      )
    )
    .limit(1)

  if (!membership) {
    return null
  }

  // Check if owner
  const [company] = await db
    .select({ ownerId: companies.ownerId })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)

  return {
    role: membership.role,
    isOwner: company?.ownerId === userId,
  }
}

/**
 * Check if user can perform action on company
 */
export async function canUserManageCompany(userId: string, companyId: string): Promise<boolean> {
  const userRole = await getUserRoleInCompany(userId, companyId)
  if (!userRole) return false

  // Owner and admins can manage
  return userRole.isOwner || userRole.role === 'admin'
}

// Re-export related services
export * from './employees'
export * from './invites'
