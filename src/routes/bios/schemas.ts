/**
 * Bio Generator Routes Validation Schemas
 */

import { z } from 'zod'

// Platform types
export const platformSchema = z.enum([
  'twitter',
  'instagram',
  'linkedin_summary',
  'linkedin_headline',
  'tinder',
  'hinge',
  'bumble',
  'general_dating',
  'custom',
])

// Persona types
export const personaTypeSchema = z.enum(['professional', 'dating', 'social', 'private'])

// Generate bio request schema
export const generateBioSchema = z.object({
  platform: platformSchema,
  personaType: personaTypeSchema.optional(),
  customInstructions: z.string().max(500).optional(),
  variations: z.number().min(1).max(5).default(3),
  saveToHistory: z.boolean().default(true),
})

// Generate dating prompt answer schema
export const generateDatingPromptSchema = z.object({
  promptQuestion: z.string().min(5).max(200),
  maxLength: z.number().min(50).max(500).default(150),
  saveToHistory: z.boolean().default(true),
})

// Regenerate with feedback schema
export const regenerateSchema = z.object({
  feedback: z.string().min(10).max(500),
})

// List bios query schema
export const listBiosQuerySchema = z.object({
  platform: platformSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

// Bio ID parameter
export const bioIdSchema = z.string().uuid('Invalid bio ID')
