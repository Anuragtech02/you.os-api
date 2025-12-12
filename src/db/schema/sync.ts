import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

// Enums
export const syncEventTypeEnum = pgEnum('sync_event_type', [
  'content_generated',
  'feedback_received',
  'photo_analyzed',
  'profile_updated',
  'sync_all_triggered',
])

export const jobStatusEnum = pgEnum('job_status', [
  'pending',
  'in_progress',
  'completed',
  'failed',
  'cancelled',
])

export const moduleStatusEnum = pgEnum('module_status', [
  'pending',
  'in_progress',
  'completed',
  'failed',
  'skipped',
])

// Sync Events table
export const syncEvents = pgTable(
  'sync_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    eventType: syncEventTypeEnum('event_type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().default({}).notNull(),
    sequenceNumber: integer('sequence_number').notNull(),

    // Processing status
    processedAt: timestamp('processed_at', { withTimezone: true }),
    error: text('error'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_sync_events_user_id').on(table.userId),
    index('idx_sync_events_processed').on(table.processedAt),
    index('idx_sync_events_sequence').on(table.sequenceNumber),
  ]
)

// Sync Jobs table
export const syncJobs = pgTable(
  'sync_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    status: jobStatusEnum('status').default('pending').notNull(),
    triggeredBy: text('triggered_by'), // 'manual', 'auto', 'feedback'

    // Progress tracking
    totalModules: integer('total_modules').notNull(),
    completedModules: integer('completed_modules').default(0).notNull(),
    currentModule: text('current_module'),

    // Module results
    moduleResults: jsonb('module_results').$type<ModuleResults>().default({}).notNull(),

    // Error tracking
    error: text('error'),

    // Timing
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_sync_jobs_user_id').on(table.userId),
    index('idx_sync_jobs_status').on(table.status),
    index('idx_sync_jobs_created').on(table.createdAt),
  ]
)

// Type definitions
export interface ModuleResult {
  module: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  startedAt?: string
  completedAt?: string
  itemsProcessed?: number
  error?: string
  details?: Record<string, unknown>
}

export interface ModuleResults {
  photo_engine?: ModuleResult
  bio_generator?: ModuleResult
  career_module?: ModuleResult
  dating_module?: ModuleResult
  aesthetic_module?: ModuleResult
  [key: string]: ModuleResult | undefined
}

// Infer types
export type SyncEvent = typeof syncEvents.$inferSelect
export type NewSyncEvent = typeof syncEvents.$inferInsert
export type SyncJob = typeof syncJobs.$inferSelect
export type NewSyncJob = typeof syncJobs.$inferInsert
