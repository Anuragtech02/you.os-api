import {
  boolean,
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
import { users } from './users'

// Enums
export const photoStatusEnum = pgEnum('photo_status', [
  'pending',
  'analyzing',
  'analyzed',
  'enhanced',
  'failed',
])

// Photos table
export const photos = pgTable(
  'photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Storage
    originalUrl: text('original_url').notNull(),
    enhancedUrl: text('enhanced_url'),
    thumbnailUrl: text('thumbnail_url'),
    storagePath: text('storage_path').notNull(),

    // Analysis results
    status: photoStatusEnum('status').default('pending').notNull(),
    scores: jsonb('scores').$type<PhotoScores>().default({}).notNull(),
    overallScore: real('overall_score'),
    analysis: jsonb('analysis').$type<PhotoAnalysis>().default({}).notNull(),

    // AI Enhancement
    enhancementApplied: jsonb('enhancement_applied').$type<EnhancementDetails>(),
    enhancementCost: real('enhancement_cost'),

    // Embedding for similarity search
    embedding: vector('embedding', { dimensions: 1536 }),

    // Metadata
    metadata: jsonb('metadata').$type<PhotoMetadata>().default({}).notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    isPublic: boolean('is_public').default(true).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    analyzedAt: timestamp('analyzed_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_photos_user_id').on(table.userId),
    index('idx_photos_status').on(table.status),
    index('idx_photos_overall_score').on(table.overallScore),
  ]
)

// Type definitions
export interface PhotoScores {
  technical?: number // 0-100: lighting, focus, resolution
  aesthetic?: number // 0-100: composition, color harmony
  context?: number // 0-100: appropriateness for intended use
  authenticity?: number // 0-100: natural vs over-processed
  weighted?: number // Final weighted score
}

export interface PhotoAnalysis {
  // Face detection
  faceDetected?: boolean
  faceCount?: number
  facialExpression?: string
  eyeContact?: boolean

  // Composition
  composition?: string
  lighting?: string
  background?: string

  // Style analysis
  styleCategory?: string[]
  colorDominant?: string[]
  mood?: string

  // Quality issues
  issues?: string[]
  suggestions?: string[]

  // Context recommendations
  bestFor?: string[] // e.g., ['linkedin', 'dating', 'instagram']
  avoidFor?: string[]

  // Raw AI response
  rawAnalysis?: string
}

export interface EnhancementDetails {
  provider?: string // e.g., 'nano_banana', 'gemini'
  operations?: string[] // e.g., ['background_blur', 'lighting_fix', 'skin_smooth']
  beforeScore?: number
  afterScore?: number
  processingTimeMs?: number
}

export interface PhotoMetadata {
  originalFilename?: string
  mimeType?: string
  fileSize?: number
  width?: number
  height?: number
  exif?: Record<string, unknown>
  uploadedFrom?: 'web' | 'mobile' | 'api'
}

// Infer types
export type Photo = typeof photos.$inferSelect
export type NewPhoto = typeof photos.$inferInsert
