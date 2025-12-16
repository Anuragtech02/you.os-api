/**
 * Employee Management Service
 *
 * Manages employees within a company.
 */

import { db } from '@/db/client'
import { companies, companyCandidates, type CompanyCandidate } from '@/db/schema/companies'
import { users } from '@/db/schema/users'
import { eq, and, desc } from 'drizzle-orm'
import { ApiError } from '@/utils/errors'

export interface EmployeeWithUser {
  id: string
  userId: string
  email: string
  fullName: string | null
  role: string
  department: string | null
  title: string | null
  joinedAt: Date | null
  isActive: boolean
}

/**
 * List employees in a company
 */
export async function listEmployees(
  companyId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ employees: EmployeeWithUser[]; total: number }> {
  const { limit = 50, offset = 0 } = options

  const results = await db
    .select({
      id: companyCandidates.id,
      userId: companyCandidates.userId,
      email: users.email,
      fullName: users.fullName,
      role: companyCandidates.role,
      department: companyCandidates.department,
      title: companyCandidates.title,
      joinedAt: companyCandidates.joinedAt,
      isActive: companyCandidates.isActive,
    })
    .from(companyCandidates)
    .innerJoin(users, eq(users.id, companyCandidates.userId))
    .where(and(eq(companyCandidates.companyId, companyId), eq(companyCandidates.isActive, true)))
    .orderBy(desc(companyCandidates.joinedAt))
    .limit(limit)
    .offset(offset)

  // Get total count
  const allEmployees = await db
    .select({ id: companyCandidates.id })
    .from(companyCandidates)
    .where(and(eq(companyCandidates.companyId, companyId), eq(companyCandidates.isActive, true)))

  return {
    employees: results,
    total: allEmployees.length,
  }
}

/**
 * Get employee by ID
 */
export async function getEmployee(companyId: string, userId: string): Promise<EmployeeWithUser | null> {
  const [employee] = await db
    .select({
      id: companyCandidates.id,
      userId: companyCandidates.userId,
      email: users.email,
      fullName: users.fullName,
      role: companyCandidates.role,
      department: companyCandidates.department,
      title: companyCandidates.title,
      joinedAt: companyCandidates.joinedAt,
      isActive: companyCandidates.isActive,
    })
    .from(companyCandidates)
    .innerJoin(users, eq(users.id, companyCandidates.userId))
    .where(
      and(
        eq(companyCandidates.companyId, companyId),
        eq(companyCandidates.userId, userId),
        eq(companyCandidates.isActive, true)
      )
    )
    .limit(1)

  return employee || null
}

/**
 * Update employee role/details
 */
export async function updateEmployee(
  companyId: string,
  userId: string,
  data: {
    role?: string
    department?: string
    title?: string
  }
): Promise<CompanyCandidate> {
  const updateData: Partial<CompanyCandidate> = {
    updatedAt: new Date(),
  }

  if (data.role !== undefined) updateData.role = data.role
  if (data.department !== undefined) updateData.department = data.department
  if (data.title !== undefined) updateData.title = data.title

  const [employee] = await db
    .update(companyCandidates)
    .set(updateData)
    .where(and(eq(companyCandidates.companyId, companyId), eq(companyCandidates.userId, userId)))
    .returning()

  if (!employee) {
    throw new ApiError('NOT_FOUND', 'Employee not found', 404)
  }

  return employee
}

/**
 * Remove employee from company
 */
export async function removeEmployee(companyId: string, userId: string): Promise<void> {
  // Check if trying to remove owner
  const [company] = await db
    .select({ ownerId: companies.ownerId })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)

  if (company?.ownerId === userId) {
    throw new ApiError('VALIDATION_ERROR', 'Cannot remove company owner. Transfer ownership first.', 400)
  }

  await db
    .update(companyCandidates)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(companyCandidates.companyId, companyId), eq(companyCandidates.userId, userId)))
}

/**
 * Transfer company ownership
 */
export async function transferOwnership(
  companyId: string,
  currentOwnerId: string,
  newOwnerId: string
): Promise<void> {
  // Verify current owner
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1)

  if (!company) {
    throw new ApiError('NOT_FOUND', 'Company not found', 404)
  }

  if (company.ownerId !== currentOwnerId) {
    throw new ApiError('FORBIDDEN', 'Only the owner can transfer ownership', 403)
  }

  // Verify new owner is an employee
  const [newOwner] = await db
    .select()
    .from(companyCandidates)
    .where(
      and(
        eq(companyCandidates.companyId, companyId),
        eq(companyCandidates.userId, newOwnerId),
        eq(companyCandidates.isActive, true)
      )
    )
    .limit(1)

  if (!newOwner) {
    throw new ApiError('VALIDATION_ERROR', 'New owner must be an existing employee', 400)
  }

  // Transfer ownership
  await db.update(companies).set({ ownerId: newOwnerId, updatedAt: new Date() }).where(eq(companies.id, companyId))

  // Update new owner role to admin
  await db
    .update(companyCandidates)
    .set({ role: 'admin', updatedAt: new Date() })
    .where(and(eq(companyCandidates.companyId, companyId), eq(companyCandidates.userId, newOwnerId)))
}

/**
 * Add user to company directly (without invite)
 */
export async function addEmployee(
  companyId: string,
  userId: string,
  data: {
    role?: string
    department?: string
    title?: string
  } = {}
): Promise<CompanyCandidate> {
  // Check if already a member
  const [existing] = await db
    .select()
    .from(companyCandidates)
    .where(and(eq(companyCandidates.companyId, companyId), eq(companyCandidates.userId, userId)))
    .limit(1)

  if (existing) {
    if (existing.isActive) {
      throw new ApiError('CONFLICT', 'User is already a member of this company', 409)
    }

    // Reactivate if previously removed
    const [reactivated] = await db
      .update(companyCandidates)
      .set({
        isActive: true,
        role: data.role || 'employee',
        department: data.department,
        title: data.title,
        joinedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(companyCandidates.id, existing.id))
      .returning()

    return reactivated!
  }

  const [employee] = await db
    .insert(companyCandidates)
    .values({
      companyId,
      userId,
      role: data.role || 'employee',
      department: data.department,
      title: data.title,
      joinedAt: new Date(),
    })
    .returning()

  return employee!
}
