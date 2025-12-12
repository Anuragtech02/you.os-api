import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  vector,
} from 'drizzle-orm/pg-core'
import { personas } from './identity-brain'
import { users } from './users'

// Enums
export const contentTypeEnum = pgEnum('content_type', [
  'bio',
  'resume',
  'cover_letter',
  'linkedin_summary',
  'dating_profile',
  'dating_prompt',
  'message',
  'custom',
])

export const feedbackTypeEnum = pgEnum('feedback_type', ['positive', 'negative', 'neutral'])

// Generated Content table
export const generatedContent = pgTable(
  'generated_content',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    personaId: uuid('persona_id').references(() => personas.id, { onDelete: 'set null' }),

    // Content
    contentType: contentTypeEnum('content_type').notNull(),
    platform: text('platform'), // e.g., 'twitter', 'linkedin', 'hinge'
    title: text('title'),
    content: text('content').notNull(),

    // Generation context
    prompt: text('prompt'),
    model: text('model').notNull(),
    generationParams: jsonb('generation_params').$type<GenerationParams>().default({}).notNull(),

    // Embedding for similarity and learning
    embedding: vector('embedding', { dimensions: 1536 }),

    // Cost tracking
    tokensUsed: real('tokens_used'),
    costUsd: real('cost_usd'),

    // Feedback
    feedbackType: feedbackTypeEnum('feedback_type'),
    feedbackComment: text('feedback_comment'),
    feedbackAt: timestamp('feedback_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_content_user_id').on(table.userId),
    index('idx_content_type').on(table.contentType),
    index('idx_content_platform').on(table.platform),
    index('idx_content_feedback').on(table.feedbackType),
  ]
)

// Content Templates table (for saved/favorite generations)
export const contentTemplates = pgTable(
  'content_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    description: text('description'),
    contentType: contentTypeEnum('content_type').notNull(),
    platform: text('platform'),

    // Template content
    template: text('template').notNull(),
    variables: jsonb('variables').$type<string[]>().default([]).notNull(),

    // Usage tracking
    usageCount: real('usage_count').default(0).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_templates_user_id').on(table.userId)]
)

// Type definitions
export interface GenerationParams {
  temperature?: number
  maxTokens?: number
  persona?: string
  tone?: string[]
  length?: 'short' | 'medium' | 'long'
  includeEmoji?: boolean
  customInstructions?: string
  contextPhotos?: string[] // Photo IDs used for context
}

// Infer types
export type GeneratedContent = typeof generatedContent.$inferSelect
export type NewGeneratedContent = typeof generatedContent.$inferInsert
export type ContentTemplate = typeof contentTemplates.$inferSelect
export type NewContentTemplate = typeof contentTemplates.$inferInsert
