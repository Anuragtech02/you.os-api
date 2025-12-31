/**
 * Photo Routes Validation Schemas
 */

import { z } from 'zod'

// Photo ID parameter
export const photoIdSchema = z.string().uuid('Invalid photo ID')

// Pagination schema
export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

// List photos query schema
export const listPhotosQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  status: z.enum(['pending', 'analyzing', 'analyzed', 'enhanced', 'failed']).optional(),
  sortBy: z.enum(['createdAt', 'overallScore']).default('createdAt'),
})

// Persona context schema
export const personaContextSchema = z.enum(['professional', 'dating', 'social', 'private'])

// Optimization preset schema
export const optimizationPresetSchema = z.enum(['professional', 'attractive', 'neutral'])

// Enhancement options schema
export const enhancementOptionsSchema = z.object({
  enhanceLighting: z.boolean().default(true),
  enhanceColors: z.boolean().default(true),
  smoothSkin: z.boolean().default(true),
  improveBackground: z.boolean().default(true),
  customInstructions: z.string().max(500).optional(),
})

// Category update schema
export const categoryUpdateSchema = z.object({
  isPublic: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
})

// Upload validation (for multipart form)
export const uploadSchema = z.object({
  // File validation happens at route level
  uploadedFrom: z.enum(['web', 'mobile', 'api']).default('web'),
})
