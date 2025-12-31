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
  'optimizing',
  'optimized',
  'enhanced', // Legacy - kept for backward compatibility
  'failed',
])

export const optimizationPresetEnum = pgEnum('optimization_preset', [
  'professional', // LinkedIn, resumes, corporate - clean, credible, restrained
  'attractive',   // Social media, personal branding - polished, confident, natural
  'neutral',      // Minimal enhancement - preserves identity as closely as possible
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

// Photo Optimizations table - stores the 3 optimization variants per photo
export const photoOptimizations = pgTable(
  'photo_optimizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    photoId: uuid('photo_id')
      .notNull()
      .references(() => photos.id, { onDelete: 'cascade' }),

    // Optimization type
    preset: optimizationPresetEnum('preset').notNull(),

    // Storage
    url: text('url').notNull(),
    storagePath: text('storage_path').notNull(),

    // Optimization details
    details: jsonb('details').$type<OptimizationDetails>().default({}).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_photo_optimizations_photo_id').on(table.photoId),
    index('idx_photo_optimizations_preset').on(table.preset),
  ]
)

export interface OptimizationDetails {
  provider?: string // e.g., 'gemini'
  processingTimeMs?: number
  // What was applied
  adjustments?: {
    lighting?: 'subtle' | 'moderate' | 'none'
    colorCorrection?: 'subtle' | 'moderate' | 'none'
    skinRetouching?: 'subtle' | 'moderate' | 'none'
    backgroundCleanup?: 'subtle' | 'moderate' | 'none'
  }
  // Identity preservation score (0-100, higher = more identity preserved)
  identityPreservation?: number
}

// Infer types
export type Photo = typeof photos.$inferSelect
export type NewPhoto = typeof photos.$inferInsert
export type PhotoOptimization = typeof photoOptimizations.$inferSelect
export type NewPhotoOptimization = typeof photoOptimizations.$inferInsert
export type OptimizationPreset = 'professional' | 'attractive' | 'neutral'
