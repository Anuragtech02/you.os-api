/**
 * Identity Brain Validation Schemas
 */

import { z } from 'zod'

// Core Attributes Schema
export const coreAttributesSchema = z.object({
  name: z.string().max(100).optional(),
  age: z.number().int().min(0).max(150).optional(),
  location: z.string().max(200).optional(),
  occupation: z.string().max(200).optional(),
  headline: z.string().max(200).optional(),
  shortBio: z.string().max(1000).optional(),
  interests: z.array(z.string().max(100)).max(50).optional(),
  values: z.array(z.string().max(100)).max(20).optional(),
  personality: z.array(z.string().max(100)).max(20).optional(),
  goals: z.array(z.string().max(500)).max(20).optional(),
  quirks: z.array(z.string().max(200)).max(20).optional(),
  communicationStyle: z.string().max(500).optional(),
})

// Color Palette Schema
export const colorPaletteSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondary: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(5).optional(),
  accents: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(5).optional(),
  neutrals: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(5).optional(),
  avoid: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(10).optional(),
  season: z.enum(['spring', 'summer', 'autumn', 'winter']).optional(),
  undertone: z.enum(['warm', 'cool', 'neutral']).optional(),
})

// Aesthetic State Schema
export const aestheticStateSchema = z.object({
  colorPalette: colorPaletteSchema.optional(),
  styleArchetype: z.string().max(100).optional(),
  hairSuggestions: z.array(z.string().max(200)).max(10).optional(),
  makeupSuggestions: z.array(z.string().max(200)).max(10).optional(),
  wardrobeGuidance: z.array(z.string().max(500)).max(20).optional(),
})

// Content Rules Schema
export const contentRulesSchema = z.object({
  maxLength: z.number().int().min(1).max(10000).optional(),
  minLength: z.number().int().min(1).max(10000).optional(),
  includeEmoji: z.boolean().optional(),
  formality: z.enum(['casual', 'neutral', 'formal']).optional(),
  excludeTopics: z.array(z.string().max(100)).max(50).optional(),
})

// Persona Type Enum
export const personaTypeSchema = z.enum(['professional', 'dating', 'social', 'private'])

// Tone Weights Schema (string keys, number values 0-1)
export const toneWeightsSchema = z.record(z.string(), z.number().min(0).max(1))

// Create Identity Brain Schema
export const createIdentityBrainSchema = z.object({
  coreAttributes: coreAttributesSchema.optional(),
  aestheticState: aestheticStateSchema.optional(),
})

// Update Identity Brain Schema
export const updateIdentityBrainSchema = z.object({
  coreAttributes: coreAttributesSchema.optional(),
  aestheticState: aestheticStateSchema.optional(),
})

// Update Core Attributes Schema
export const updateCoreAttributesSchema = coreAttributesSchema

// Update Aesthetic State Schema
export const updateAestheticStateSchema = aestheticStateSchema

// Create Persona Schema
export const createPersonaSchema = z.object({
  personaType: personaTypeSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  toneWeights: toneWeightsSchema.optional(),
  styleMarkers: z.array(z.string().max(100)).max(20).optional(),
  contentRules: contentRulesSchema.optional(),
})

// Update Persona Schema
export const updatePersonaSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  toneWeights: toneWeightsSchema.optional(),
  styleMarkers: z.array(z.string().max(100)).max(20).optional(),
  contentRules: contentRulesSchema.optional(),
})

// Create Snapshot Schema
export const createSnapshotSchema = z.object({
  name: z.string().min(1).max(100),
})

// Rollback Schema
export const rollbackSchema = z.object({
  versionNumber: z.number().int().min(1),
})

// Process Feedback Schema
export const processFeedbackSchema = z.object({
  contentId: z.string().uuid(),
  contentType: z.string().min(1).max(50),
  rating: z.enum(['positive', 'negative', 'neutral']),
  comment: z.string().max(1000).optional(),
  content: z.string().max(10000).optional(),
})

// Pagination Schema
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

// Export types
export type CoreAttributesInput = z.infer<typeof coreAttributesSchema>
export type AestheticStateInput = z.infer<typeof aestheticStateSchema>
export type CreateIdentityBrainInput = z.infer<typeof createIdentityBrainSchema>
export type UpdateIdentityBrainInput = z.infer<typeof updateIdentityBrainSchema>
export type CreatePersonaInput = z.infer<typeof createPersonaSchema>
export type UpdatePersonaInput = z.infer<typeof updatePersonaSchema>
export type ProcessFeedbackInput = z.infer<typeof processFeedbackSchema>
