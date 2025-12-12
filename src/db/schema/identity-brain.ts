import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from 'drizzle-orm/pg-core'
import { users } from './users'

// Enums
export const personaTypeEnum = pgEnum('persona_type', [
  'professional',
  'dating',
  'social',
  'private',
])
export const versionTypeEnum = pgEnum('version_type', ['auto', 'manual'])
export const syncStatusEnum = pgEnum('sync_status', ['idle', 'in_progress', 'completed', 'failed'])

// Identity Brain table
export const identityBrains = pgTable(
  'identity_brains',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Core attributes
    coreAttributes: jsonb('core_attributes').$type<CoreAttributes>().default({}).notNull(),

    // State containers
    aestheticState: jsonb('aesthetic_state').$type<AestheticState>().default({}).notNull(),
    learningState: jsonb('learning_state').$type<LearningState>().default({}).notNull(),

    // Embeddings (1536 dimensions for text-embedding-3-small)
    identityEmbedding: vector('identity_embedding', { dimensions: 1536 }),
    contentEmbedding: vector('content_embedding', { dimensions: 1536 }),

    // Sync status
    syncStatus: syncStatusEnum('sync_status').default('idle').notNull(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    currentVersion: integer('current_version').default(1).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_identity_brains_user_id').on(table.userId)]
)

// Identity Brain Versions for rollback
export const identityBrainVersions = pgTable(
  'identity_brain_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    identityBrainId: uuid('identity_brain_id')
      .notNull()
      .references(() => identityBrains.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    versionType: versionTypeEnum('version_type').default('auto').notNull(),
    snapshotName: text('snapshot_name'),

    // Snapshot data
    coreAttributes: jsonb('core_attributes').$type<CoreAttributes>().notNull(),
    aestheticState: jsonb('aesthetic_state').$type<AestheticState>().notNull(),
    learningState: jsonb('learning_state').$type<LearningState>().notNull(),
    identityEmbedding: vector('identity_embedding', { dimensions: 1536 }),
    contentEmbedding: vector('content_embedding', { dimensions: 1536 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_versions_identity_brain_id').on(table.identityBrainId)]
)

// Personas table
export const personas = pgTable(
  'personas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    identityBrainId: uuid('identity_brain_id')
      .notNull()
      .references(() => identityBrains.id, { onDelete: 'cascade' }),
    personaType: personaTypeEnum('persona_type').notNull(),
    name: text('name').notNull(),
    description: text('description'),

    // Persona-specific adjustments
    toneWeights: jsonb('tone_weights').$type<Record<string, number>>().default({}).notNull(),
    styleMarkers: jsonb('style_markers').$type<string[]>().default([]).notNull(),
    contentRules: jsonb('content_rules').$type<ContentRules>().default({}).notNull(),

    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_personas_identity_brain_id').on(table.identityBrainId)]
)

// Type definitions
export interface CoreAttributes {
  name?: string
  age?: number
  location?: string
  occupation?: string
  interests?: string[]
  values?: string[]
  personality?: string[]
  goals?: string[]
  quirks?: string[]
  communicationStyle?: string
  [key: string]: unknown
}

export interface AestheticState {
  colorPalette?: {
    primary: string
    secondary: string[]
    accents: string[]
    neutrals: string[]
    avoid: string[]
    season: 'spring' | 'summer' | 'autumn' | 'winter'
    undertone: 'warm' | 'cool' | 'neutral'
  }
  styleArchetype?: string
  hairSuggestions?: string[]
  makeupSuggestions?: string[]
  wardrobeGuidance?: string[]
  lastAnalyzedAt?: string
}

export interface LearningState {
  feedbackHistory?: FeedbackEntry[]
  contentPatterns?: {
    preferredLength?: 'short' | 'medium' | 'long'
    preferredTone?: string[]
    avoidTopics?: string[]
    favoriteTopics?: string[]
  }
  performanceMetrics?: {
    totalGenerations?: number
    positiveRatings?: number
    negativeRatings?: number
    averageScore?: number
  }
  lastLearnedAt?: string
}

export interface FeedbackEntry {
  contentId: string
  contentType: string
  rating: 'positive' | 'negative' | 'neutral'
  comment?: string
  timestamp: string
  decayWeight?: number
}

export interface ContentRules {
  maxLength?: number
  minLength?: number
  includeEmoji?: boolean
  formality?: 'casual' | 'neutral' | 'formal'
  excludeTopics?: string[]
}

// Infer types
export type IdentityBrain = typeof identityBrains.$inferSelect
export type NewIdentityBrain = typeof identityBrains.$inferInsert
export type IdentityBrainVersion = typeof identityBrainVersions.$inferSelect
export type Persona = typeof personas.$inferSelect
export type NewPersona = typeof personas.$inferInsert
