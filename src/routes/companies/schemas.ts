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

// Brand guidelines schema
export const brandGuidelinesSchema = z.object({
  voiceTone: z.enum(['professional', 'casual', 'technical', 'friendly']).optional(),
  toneAttributes: z.array(z.string().max(50)).max(10).optional(),
  industry: z.string().max(100).optional(),
  targetAudience: z.string().max(500).optional(),
  keyMessaging: z.string().max(1000).optional(),
  wordsToAvoid: z.array(z.string().max(50)).max(20).optional(),
  wordsToInclude: z.array(z.string().max(50)).max(20).optional(),
  communicationStyle: z.enum(['formal', 'informal', 'balanced']).optional(),
})

// Activity type filter
export const activityTypeSchema = z.enum([
  'member_joined',
  'identity_completed',
  'first_photo',
  'first_bio',
  'content_generated',
])

// Activity feed query schema
export const activityFeedQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  type: activityTypeSchema.optional(),
})
