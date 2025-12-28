/**
 * Super Admin Service
 *
 * Service layer for Super Admin operations:
 * - Create/manage companies
 * - Assign Company Admins
 * - View/manage users
 * - System-wide operations
 */

import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  adminUsers,
  companies,
  companyCandidates,
  companyInvites,
  users,
  identityBrains,
  type AdminUser,
  type Company,
  type User,
  type CompanyCandidate,
  type CompanyInvite,
} from '@/db/schema'
import { ApiError } from '@/utils/errors'
import { ErrorCodes } from '@/utils/response'

// =========================================
// Admin User Management
// =========================================

/**
 * Get admin user by user ID
 */
export async function getAdminByUserId(userId: string): Promise<AdminUser | null> {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(and(eq(adminUsers.userId, userId), eq(adminUsers.isActive, true)))
    .limit(1)

  return admin || null
}

/**
 * Check if user is a Super Admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const admin = await getAdminByUserId(userId)
  return admin?.role === 'super_admin'
}

/**
 * Check if user is any admin role
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const admin = await getAdminByUserId(userId)
  return !!admin
}

/**
 * Create admin user (Super Admin only)
 */
export async function createAdminUser(
  userId: string,
  role: 'super_admin' | 'admin' | 'moderator' | 'support',
  createdBy?: string
): Promise<AdminUser> {
  // Check if already an admin
  const existing = await getAdminByUserId(userId)
  if (existing) {
    throw new ApiError(ErrorCodes.ALREADY_EXISTS, 'User is already an admin', 409)
  }

  // Verify user exists
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'User not found', 404)
  }

  const [admin] = await db
    .insert(adminUsers)
    .values({
      userId,
      role,
      createdBy,
      permissions: getDefaultPermissions(role),
    })
    .returning()

  if (!admin) {
    throw new ApiError(ErrorCodes.INTERNAL_ERROR, 'Failed to create admin', 500)
  }

  return admin
}

/**
 * Update admin role
 */
export async function updateAdminRole(
  adminId: string,
  role: 'super_admin' | 'admin' | 'moderator' | 'support'
): Promise<AdminUser> {
  const [updated] = await db
    .update(adminUsers)
    .set({
      role,
      permissions: getDefaultPermissions(role),
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.id, adminId))
    .returning()

  if (!updated) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'Admin not found', 404)
  }

  return updated
}

/**
 * Update admin last login timestamp
 */
export async function updateAdminLastLogin(adminId: string): Promise<void> {
  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(adminUsers.id, adminId))
}

/**
 * Deactivate admin
 */
export async function deactivateAdmin(adminId: string): Promise<void> {
  const [updated] = await db
    .update(adminUsers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(adminUsers.id, adminId))
    .returning()

  if (!updated) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'Admin not found', 404)
  }
}

/**
 * List all admins
 */
export async function listAdmins(options: {
  limit?: number
  offset?: number
}): Promise<{ admins: (AdminUser & { user: User | null })[]; total: number }> {
  const { limit = 50, offset = 0 } = options

  const adminsWithUsers = await db
    .select({
      admin: adminUsers,
      user: users,
    })
    .from(adminUsers)
    .leftJoin(users, eq(adminUsers.userId, users.id))
    .where(eq(adminUsers.isActive, true))
    .orderBy(desc(adminUsers.createdAt))
    .limit(limit)
    .offset(offset)

  const totalResult = await db
    .select({ value: count() })
    .from(adminUsers)
    .where(eq(adminUsers.isActive, true))

  const total = totalResult[0]?.value ?? 0

  return {
    admins: adminsWithUsers.map((row) => ({
      ...row.admin,
      user: row.user,
    })),
    total,
  }
}

// =========================================
// Company Management (Super Admin)
// =========================================

/**
 * Create company (Super Admin)
 */
export async function createCompanyAsAdmin(
  data: {
    name: string
    slug: string
    domain?: string
    logoUrl?: string
  },
  ownerId: string
): Promise<Company> {
  // Verify owner exists
  const [owner] = await db.select().from(users).where(eq(users.id, ownerId)).limit(1)
  if (!owner) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'Owner user not found', 404)
  }

  // Check slug is unique
  const [existing] = await db.select().from(companies).where(eq(companies.slug, data.slug)).limit(1)
  if (existing) {
    throw new ApiError(ErrorCodes.ALREADY_EXISTS, 'Company slug already exists', 409)
  }

  // Create company
  const [company] = await db
    .insert(companies)
    .values({
      name: data.name,
      slug: data.slug,
      domain: data.domain,
      logoUrl: data.logoUrl,
      ownerId,
      subscriptionTier: 'business',
      subscriptionStatus: 'active',
    })
    .returning()

  if (!company) {
    throw new ApiError(ErrorCodes.INTERNAL_ERROR, 'Failed to create company', 500)
  }

  // Update owner's account type and company association
  await db
    .update(users)
    .set({
      accountType: 'company',
      companyId: company.id,
      updatedAt: new Date(),
    })
    .where(eq(users.id, ownerId))

  // Add owner as company admin in company_candidates
  await db.insert(companyCandidates).values({
    companyId: company.id,
    userId: ownerId,
    role: 'admin',
    permissions: {
      canEditProfile: true,
      canViewAnalytics: true,
      canExportData: true,
      canInviteOthers: true,
    },
    joinedAt: new Date(),
  })

  return company
}

/**
 * List all companies (Super Admin)
 */
export async function listAllCompanies(options: {
  limit?: number
  offset?: number
  search?: string
}): Promise<{ companies: (Company & { ownerEmail: string | null; memberCount: number })[]; total: number }> {
  const { limit = 50, offset = 0, search } = options

  let query = db
    .select({
      company: companies,
      ownerEmail: users.email,
    })
    .from(companies)
    .leftJoin(users, eq(companies.ownerId, users.id))
    .where(eq(companies.isActive, true))
    .orderBy(desc(companies.createdAt))
    .limit(limit)
    .offset(offset)

  if (search) {
    query = db
      .select({
        company: companies,
        ownerEmail: users.email,
      })
      .from(companies)
      .leftJoin(users, eq(companies.ownerId, users.id))
      .where(
        and(
          eq(companies.isActive, true),
          or(ilike(companies.name, `%${search}%`), ilike(companies.slug, `%${search}%`))
        )
      )
      .orderBy(desc(companies.createdAt))
      .limit(limit)
      .offset(offset)
  }

  const results = await query

  // Get member counts
  const companiesWithCounts = await Promise.all(
    results.map(async (row) => {
      const countResult = await db
        .select({ value: count() })
        .from(companyCandidates)
        .where(eq(companyCandidates.companyId, row.company.id))

      return {
        ...row.company,
        ownerEmail: row.ownerEmail,
        memberCount: countResult[0]?.value ?? 0,
      }
    })
  )

  const totalResult = await db
    .select({ value: count() })
    .from(companies)
    .where(eq(companies.isActive, true))

  const total = totalResult[0]?.value ?? 0

  return {
    companies: companiesWithCounts,
    total,
  }
}

/**
 * Assign Company Admin (Super Admin)
 */
export async function assignCompanyAdmin(companyId: string, userId: string): Promise<void> {
  // Verify company exists
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1)
  if (!company) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'Company not found', 404)
  }

  // Verify user exists
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'User not found', 404)
  }

  // Check if user is already in company
  const [existing] = await db
    .select()
    .from(companyCandidates)
    .where(and(eq(companyCandidates.companyId, companyId), eq(companyCandidates.userId, userId)))
    .limit(1)

  if (existing) {
    // Update to admin role
    await db
      .update(companyCandidates)
      .set({
        role: 'admin',
        permissions: {
          canEditProfile: true,
          canViewAnalytics: true,
          canExportData: true,
          canInviteOthers: true,
        },
        updatedAt: new Date(),
      })
      .where(eq(companyCandidates.id, existing.id))
  } else {
    // Add as admin
    await db.insert(companyCandidates).values({
      companyId,
      userId,
      role: 'admin',
      permissions: {
        canEditProfile: true,
        canViewAnalytics: true,
        canExportData: true,
        canInviteOthers: true,
      },
      joinedAt: new Date(),
    })
  }

  // Update user's company association
  await db
    .update(users)
    .set({
      accountType: 'company',
      companyId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
}

/**
 * Update company (Super Admin)
 */
export async function updateCompanyAsAdmin(
  companyId: string,
  data: {
    name?: string
    slug?: string
    domain?: string
    logoUrl?: string
    subscriptionTier?: string
    subscriptionStatus?: string
    isActive?: boolean
  }
): Promise<Company> {
  // Check slug uniqueness if changing
  if (data.slug) {
    const [existing] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.slug, data.slug), eq(companies.id, companyId)))
      .limit(1)

    if (!existing) {
      const [conflict] = await db.select().from(companies).where(eq(companies.slug, data.slug)).limit(1)
      if (conflict) {
        throw new ApiError(ErrorCodes.ALREADY_EXISTS, 'Company slug already exists', 409)
      }
    }
  }

  const [updated] = await db
    .update(companies)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId))
    .returning()

  if (!updated) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'Company not found', 404)
  }

  return updated
}

// =========================================
// User Management (Super Admin)
// =========================================

/**
 * List all users (Super Admin)
 */
export async function listAllUsers(options: {
  limit?: number
  offset?: number
  search?: string
  accountType?: 'individual' | 'company'
}): Promise<{ users: User[]; total: number }> {
  const { limit = 50, offset = 0, search, accountType } = options

  const conditions = [eq(users.isActive, true)]

  if (accountType) {
    conditions.push(eq(users.accountType, accountType))
  }

  if (search) {
    conditions.push(or(ilike(users.email, `%${search}%`), ilike(users.fullName, `%${search}%`))!)
  }

  const userList = await db
    .select()
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset)

  const totalResult = await db
    .select({ value: count() })
    .from(users)
    .where(and(...conditions))

  const total = totalResult[0]?.value ?? 0

  return { users: userList, total }
}

/**
 * Get user details (Super Admin)
 */
export async function getUserDetails(userId: string): Promise<{
  user: User
  identityBrain: { id: string; currentVersion: number; syncStatus: string } | null
  company: { id: string; name: string; role: string } | null
}> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

  if (!user) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'User not found', 404)
  }

  // Get identity brain
  const [brain] = await db
    .select({
      id: identityBrains.id,
      currentVersion: identityBrains.currentVersion,
      syncStatus: identityBrains.syncStatus,
    })
    .from(identityBrains)
    .where(eq(identityBrains.userId, userId))
    .limit(1)

  // Get company membership
  let companyInfo = null
  if (user.companyId) {
    const [membership] = await db
      .select({
        companyId: companies.id,
        companyName: companies.name,
        role: companyCandidates.role,
      })
      .from(companyCandidates)
      .innerJoin(companies, eq(companyCandidates.companyId, companies.id))
      .where(and(eq(companyCandidates.userId, userId), eq(companyCandidates.companyId, user.companyId)))
      .limit(1)

    if (membership) {
      companyInfo = {
        id: membership.companyId,
        name: membership.companyName,
        role: membership.role,
      }
    }
  }

  return {
    user,
    identityBrain: brain || null,
    company: companyInfo,
  }
}

/**
 * Deactivate user (Super Admin)
 */
export async function deactivateUser(userId: string): Promise<void> {
  const [updated] = await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning()

  if (!updated) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'User not found', 404)
  }
}

/**
 * Reactivate user (Super Admin)
 */
export async function reactivateUser(userId: string): Promise<void> {
  const [updated] = await db
    .update(users)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning()

  if (!updated) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'User not found', 404)
  }
}

// =========================================
// Company Employees Management (Super Admin)
// =========================================

/**
 * List company employees (Super Admin)
 */
export async function listCompanyEmployees(
  companyId: string,
  options: { limit?: number; offset?: number }
): Promise<{ employees: (CompanyCandidate & { user: User | null })[]; total: number }> {
  const { limit = 50, offset = 0 } = options

  // Verify company exists
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1)
  if (!company) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'Company not found', 404)
  }

  const employeesWithUsers = await db
    .select({
      employee: companyCandidates,
      user: users,
    })
    .from(companyCandidates)
    .leftJoin(users, eq(companyCandidates.userId, users.id))
    .where(eq(companyCandidates.companyId, companyId))
    .orderBy(desc(companyCandidates.createdAt))
    .limit(limit)
    .offset(offset)

  const totalResult = await db
    .select({ value: count() })
    .from(companyCandidates)
    .where(eq(companyCandidates.companyId, companyId))

  const total = totalResult[0]?.value ?? 0

  return {
    employees: employeesWithUsers.map((row) => ({
      ...row.employee,
      user: row.user,
    })),
    total,
  }
}

/**
 * Update company employee role (Super Admin)
 */
export async function updateCompanyEmployee(
  companyId: string,
  userId: string,
  data: { role?: string; isActive?: boolean }
): Promise<CompanyCandidate> {
  // Verify company exists
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1)
  if (!company) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'Company not found', 404)
  }

  // Find employee
  const [existing] = await db
    .select()
    .from(companyCandidates)
    .where(and(eq(companyCandidates.companyId, companyId), eq(companyCandidates.userId, userId)))
    .limit(1)

  if (!existing) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'Employee not found in company', 404)
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (data.role !== undefined) updateData.role = data.role
  if (data.isActive !== undefined) updateData.isActive = data.isActive

  const [updated] = await db
    .update(companyCandidates)
    .set(updateData)
    .where(eq(companyCandidates.id, existing.id))
    .returning()

  if (!updated) {
    throw new ApiError(ErrorCodes.INTERNAL_ERROR, 'Failed to update employee', 500)
  }

  return updated
}

/**
 * Remove company employee (Super Admin)
 */
export async function removeCompanyEmployee(companyId: string, userId: string): Promise<void> {
  // Verify company exists
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1)
  if (!company) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'Company not found', 404)
  }

  // Cannot remove owner
  if (company.ownerId === userId) {
    throw new ApiError(ErrorCodes.FORBIDDEN, 'Cannot remove company owner', 403)
  }

  // Find and delete employee
  const [deleted] = await db
    .delete(companyCandidates)
    .where(and(eq(companyCandidates.companyId, companyId), eq(companyCandidates.userId, userId)))
    .returning()

  if (!deleted) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'Employee not found in company', 404)
  }

  // Update user's company association if they're leaving
  await db
    .update(users)
    .set({
      companyId: null,
      accountType: 'individual',
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
}

// =========================================
// Company Invites Management (Super Admin)
// =========================================

/**
 * List company invites (Super Admin)
 */
export async function listCompanyInvites(
  companyId: string,
  options: { limit?: number; offset?: number; status?: string }
): Promise<{ invites: CompanyInvite[]; total: number }> {
  const { limit = 50, offset = 0, status } = options

  // Verify company exists
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1)
  if (!company) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'Company not found', 404)
  }

  const conditions = [eq(companyInvites.companyId, companyId)]
  if (status) {
    conditions.push(eq(companyInvites.status, status))
  }

  const inviteList = await db
    .select()
    .from(companyInvites)
    .where(and(...conditions))
    .orderBy(desc(companyInvites.createdAt))
    .limit(limit)
    .offset(offset)

  const totalResult = await db
    .select({ value: count() })
    .from(companyInvites)
    .where(and(...conditions))

  const total = totalResult[0]?.value ?? 0

  return { invites: inviteList, total }
}

/**
 * Revoke company invite (Super Admin)
 */
export async function revokeCompanyInvite(companyId: string, inviteId: string): Promise<void> {
  // Verify company exists
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1)
  if (!company) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'Company not found', 404)
  }

  // Find and update invite
  const [updated] = await db
    .update(companyInvites)
    .set({ status: 'revoked' })
    .where(and(eq(companyInvites.id, inviteId), eq(companyInvites.companyId, companyId)))
    .returning()

  if (!updated) {
    throw new ApiError(ErrorCodes.NOT_FOUND, 'Invite not found', 404)
  }
}

// =========================================
// Helpers
// =========================================

function getDefaultPermissions(role: string) {
  switch (role) {
    case 'super_admin':
      return {
        users: { view: true, edit: true, delete: true, deactivate: true },
        companies: { view: true, edit: true, delete: true },
        content: { view: true, delete: true, moderate: true },
        settings: { view: true, edit: true },
        audit: { view: true, export: true },
        metrics: { view: true, export: true },
      }
    case 'admin':
      return {
        users: { view: true, edit: true, delete: false, deactivate: true },
        companies: { view: true, edit: true, delete: false },
        content: { view: true, delete: true, moderate: true },
        settings: { view: true, edit: false },
        audit: { view: true, export: false },
        metrics: { view: true, export: false },
      }
    case 'moderator':
      return {
        users: { view: true, edit: false, delete: false, deactivate: false },
        companies: { view: true, edit: false, delete: false },
        content: { view: true, delete: true, moderate: true },
        settings: { view: false, edit: false },
        audit: { view: false, export: false },
        metrics: { view: false, export: false },
      }
    case 'support':
      return {
        users: { view: true, edit: false, delete: false, deactivate: false },
        companies: { view: true, edit: false, delete: false },
        content: { view: true, delete: false, moderate: false },
        settings: { view: false, edit: false },
        audit: { view: false, export: false },
        metrics: { view: false, export: false },
      }
    default:
      return {}
  }
}
