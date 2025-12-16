/**
 * Career Module Routes Validation Schemas
 */

import { z } from 'zod'

// Document types
export const careerDocumentTypeSchema = z.enum([
  'resume_summary',
  'resume_bullets',
  'cover_letter',
  'linkedin_headline',
  'linkedin_summary',
  'elevator_pitch',
])

// Experience item for resume bullets
export const experienceItemSchema = z.object({
  title: z.string().min(1).max(100),
  company: z.string().min(1).max(100),
  duration: z.string().max(50).optional(),
  responsibilities: z.array(z.string().max(500)).max(10).optional(),
  achievements: z.array(z.string().max(500)).max(10).optional(),
})

// Resume summary request
export const generateResumeSummarySchema = z.object({
  targetRole: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  customInstructions: z.string().max(500).optional(),
  saveToHistory: z.boolean().default(true),
})

// Resume bullets request
export const generateResumeBulletsSchema = z.object({
  experienceItems: z.array(experienceItemSchema).max(5).optional(),
  targetRole: z.string().max(100).optional(),
  customInstructions: z.string().max(500).optional(),
  saveToHistory: z.boolean().default(true),
})

// Cover letter request
export const generateCoverLetterSchema = z.object({
  targetRole: z.string().min(1).max(100),
  targetCompany: z.string().min(1).max(100),
  jobDescription: z.string().max(5000).optional(),
  customInstructions: z.string().max(500).optional(),
  saveToHistory: z.boolean().default(true),
})

// LinkedIn headline request
export const generateLinkedInHeadlineSchema = z.object({
  targetAudience: z.string().max(200).optional(),
  keywords: z.array(z.string().max(50)).max(10).optional(),
  customInstructions: z.string().max(500).optional(),
  saveToHistory: z.boolean().default(true),
})

// LinkedIn summary request
export const generateLinkedInSummarySchema = z.object({
  targetAudience: z.string().max(200).optional(),
  keywords: z.array(z.string().max(50)).max(10).optional(),
  customInstructions: z.string().max(500).optional(),
  saveToHistory: z.boolean().default(true),
})

// Elevator pitch request
export const generateElevatorPitchSchema = z.object({
  duration: z.enum(['30_seconds', '60_seconds']),
  context: z.enum(['networking', 'interview', 'casual', 'investor']).optional(),
  customInstructions: z.string().max(500).optional(),
  saveToHistory: z.boolean().default(true),
})

// List documents query
export const listDocumentsQuerySchema = z.object({
  documentType: careerDocumentTypeSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

// Document ID parameter
export const documentIdSchema = z.string().uuid('Invalid document ID')

// Update document request
export const updateDocumentSchema = z.object({
  content: z.string().max(10000).optional(),
  title: z.string().max(200).optional(),
}).refine(data => data.content || data.title, {
  message: 'At least one field (content or title) must be provided',
})
