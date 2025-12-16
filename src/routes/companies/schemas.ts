/**
 * Company Routes Validation Schemas
 */

import { z } from 'zod'

// Company creation
export const createCompanySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  domain: z.string().optional(),
  logoUrl: z.string().url().optional(),
})

// Company update
export const updateCompanySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  domain: z.string().optional(),
  logoUrl: z.string().url().optional(),
  brandColors: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
  }).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})

// Employee update
export const updateEmployeeSchema = z.object({
  role: z.enum(['admin', 'manager', 'employee']).optional(),
  department: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
})

// Invite creation
export const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'employee']).default('employee'),
})

// Pagination
export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

// UUID validation
export const uuidSchema = z.string().uuid()

// Invite list filter
export const inviteListSchema = z.object({
  status: z.enum(['pending', 'accepted', 'expired', 'revoked']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

// Transfer ownership
export const transferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid(),
})
