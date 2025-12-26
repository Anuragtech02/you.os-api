/**
 * Admin Route Schemas
 *
 * Zod schemas for validating admin API requests.
 */

import { z } from 'zod'

// =========================================
// Common Schemas
// =========================================

export const uuidSchema = z.string().uuid()

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
})

// =========================================
// Admin User Schemas
// =========================================

export const adminRoleSchema = z.enum(['super_admin', 'admin', 'moderator', 'support'])

export const createAdminSchema = z.object({
  userId: z.string().uuid(),
  role: adminRoleSchema,
})

export const updateAdminSchema = z.object({
  role: adminRoleSchema,
})

// =========================================
// Company Schemas
// =========================================

export const createCompanySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  domain: z.string().optional(),
  logoUrl: z.string().url().optional(),
  ownerId: z.string().uuid(),
})

export const updateCompanySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  domain: z.string().optional(),
  logoUrl: z.string().url().optional(),
  subscriptionTier: z.string().optional(),
  subscriptionStatus: z.enum(['active', 'inactive', 'suspended', 'cancelled']).optional(),
  isActive: z.boolean().optional(),
})

export const assignAdminSchema = z.object({
  userId: z.string().uuid(),
})

// =========================================
// User Schemas
// =========================================

export const userListQuerySchema = paginationSchema.extend({
  accountType: z.enum(['individual', 'company']).optional(),
})

export const userActionSchema = z.object({
  action: z.enum(['deactivate', 'reactivate']),
})

// =========================================
// Company Employee Schemas
// =========================================

export const companyEmployeeRoleSchema = z.enum(['admin', 'manager', 'candidate'])

export const updateCompanyEmployeeSchema = z.object({
  role: companyEmployeeRoleSchema.optional(),
  isActive: z.boolean().optional(),
})

// =========================================
// Invite Schemas
// =========================================

export const createInviteTokenSchema = z.object({
  email: z.string().email().optional(),
  maxUses: z.number().int().min(1).max(1000).default(1),
  expiresInDays: z.number().int().min(1).max(365).default(7),
  note: z.string().max(500).optional(),
})
