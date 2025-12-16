/**
 * Dating Module Routes Validation Schemas
 */

import { z } from 'zod'

// Platform types
export const datingPlatformSchema = z.enum(['tinder', 'hinge', 'bumble', 'general'])

// Tone types
export const messagingToneSchema = z.enum(['playful', 'witty', 'sincere', 'confident', 'casual'])

// Focus area for coaching
export const focusAreaSchema = z.enum(['profile', 'photos', 'conversation', 'confidence', 'general'])

// Conversation message
export const conversationMessageSchema = z.object({
  sender: z.enum(['user', 'match']),
  message: z.string().min(1).max(2000),
})

// Match prompt (for Hinge/Bumble)
export const matchPromptSchema = z.object({
  question: z.string().min(1).max(200),
  answer: z.string().min(1).max(500),
})

// Generate dating bio request
export const generateDatingBioSchema = z.object({
  platform: datingPlatformSchema,
  customInstructions: z.string().max(500).optional(),
  variations: z.number().min(1).max(5).default(3),
  saveToHistory: z.boolean().default(true),
})

// Generate dating prompt answer request
export const generateDatingPromptSchema = z.object({
  platform: datingPlatformSchema,
  promptQuestion: z.string().min(5).max(200),
  customInstructions: z.string().max(500).optional(),
  saveToHistory: z.boolean().default(true),
})

// Generate messaging opener request
export const generateMessagingOpenerSchema = z.object({
  matchBio: z.string().max(1000).optional(),
  matchPhotosDescription: z.string().max(1000).optional(),
  matchPrompts: z.array(matchPromptSchema).max(5).optional(),
  tone: messagingToneSchema.optional(),
})

// Generate messaging reply request
export const generateMessagingReplySchema = z.object({
  conversationHistory: z.array(conversationMessageSchema).min(1).max(50),
  matchBio: z.string().max(1000).optional(),
  tone: messagingToneSchema.optional(),
})

// Improve message request
export const improveMessageSchema = z.object({
  draftMessage: z.string().min(1).max(2000),
  context: z.string().max(500).optional(),
})

// Analyze conversation request
export const analyzeConversationSchema = z.object({
  conversationHistory: z.array(conversationMessageSchema).min(2).max(100),
  matchBio: z.string().max(1000).optional(),
})

// Generate coaching tasks request
export const generateCoachingTasksSchema = z.object({
  currentProfileScore: z.number().min(0).max(100).optional(),
  completedTasks: z.array(z.string().max(200)).max(20).optional(),
  focusArea: focusAreaSchema.optional(),
})

// List content query
export const listDatingContentQuerySchema = z.object({
  platform: datingPlatformSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

// Content ID parameter
export const contentIdSchema = z.string().uuid('Invalid content ID')
