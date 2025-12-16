/**
 * Aesthetic Module Routes Validation Schemas
 */

import { z } from 'zod'

// Style archetype types
export const styleArchetypeSchema = z.enum([
  'classic',
  'modern',
  'bold',
  'casual',
  'edgy',
  'romantic',
  'professional',
])

// Occasion types
export const occasionSchema = z.enum(['everyday', 'professional', 'dating', 'special'])

// Makeup occasion types
export const makeupOccasionSchema = z.enum(['everyday', 'professional', 'date', 'special'])

// Maintenance level
export const maintenanceLevelSchema = z.enum(['low', 'medium', 'high'])

// Skill level
export const skillLevelSchema = z.enum(['beginner', 'intermediate', 'advanced'])

// Budget level
export const budgetLevelSchema = z.enum(['budget', 'moderate', 'luxury'])

// Generate color palette request
export const generateColorPaletteSchema = z.object({
  customInstructions: z.string().max(500).optional(),
})

// Generate styling guidance request
export const generateStylingSchema = z.object({
  targetArchetype: styleArchetypeSchema.optional(),
  occasion: occasionSchema.optional(),
  customInstructions: z.string().max(500).optional(),
})

// Generate hair suggestions request
export const generateHairSchema = z.object({
  currentHairstyle: z.string().max(200).optional(),
  maintenanceLevel: maintenanceLevelSchema.optional(),
  customInstructions: z.string().max(500).optional(),
})

// Generate makeup suggestions request
export const generateMakeupSchema = z.object({
  occasion: makeupOccasionSchema.optional(),
  skillLevel: skillLevelSchema.optional(),
  customInstructions: z.string().max(500).optional(),
})

// Generate wardrobe guidance request
export const generateWardrobeSchema = z.object({
  budget: budgetLevelSchema.optional(),
  targetOccasions: z.array(z.string().max(50)).max(5).optional(),
  customInstructions: z.string().max(500).optional(),
})

// Update aesthetic preferences request
export const updatePreferencesSchema = z.object({
  gender: z.string().max(50).optional(),
  age: z.number().min(13).max(120).optional(),
  lifestyle: z.string().max(200).optional(),
  stylePreferences: z.array(z.string().max(50)).max(10).optional(),
  colorPreferences: z.array(z.string().max(50)).max(10).optional(),
  avoidStyles: z.array(z.string().max(50)).max(10).optional(),
})
