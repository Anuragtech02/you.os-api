import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

// Enums
export const adminRoleEnum = pgEnum('admin_role', ['super_admin', 'admin', 'moderator', 'support'])
export const auditActionEnum = pgEnum('audit_action', [
  'user_created',
  'user_updated',
  'user_deleted',
  'user_deactivated',
  'identity_updated',
  'photo_uploaded',
  'photo_deleted',
  'content_generated',
  'content_deleted',
  'sync_triggered',
  'company_created',
  'company_updated',
  'settings_changed',
  'admin_login',
  'admin_action',
])

// Admin Users table (separate from regular users for security)
export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: adminRoleEnum('role').default('support').notNull(),

    // Permissions (granular)
    permissions: jsonb('permissions').$type<AdminPermissions>().default({}).notNull(),

    // Security
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    lastLoginIp: text('last_login_ip'),
    mfaEnabled: boolean('mfa_enabled').default(false).notNull(),

    // Status
    isActive: boolean('is_active').default(true).notNull(),
    createdBy: uuid('created_by'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_admin_users_role').on(table.role)]
)

// Audit Logs table
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Who
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    adminId: uuid('admin_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),

    // What
    action: auditActionEnum('action').notNull(),
    resourceType: text('resource_type').notNull(), // 'user', 'photo', 'content', etc.
    resourceId: text('resource_id'),

    // Details
    details: jsonb('details').$type<Record<string, unknown>>().default({}).notNull(),
    previousState: jsonb('previous_state'),
    newState: jsonb('new_state'),

    // When
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_logs_user_id').on(table.userId),
    index('idx_audit_logs_admin_id').on(table.adminId),
    index('idx_audit_logs_action').on(table.action),
    index('idx_audit_logs_resource').on(table.resourceType, table.resourceId),
    index('idx_audit_logs_created_at').on(table.createdAt),
  ]
)

// System Settings table (key-value config)
export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  description: text('description'),
  category: text('category').default('general').notNull(),
  isPublic: boolean('is_public').default(false).notNull(), // Can be fetched by non-admins
  updatedBy: uuid('updated_by').references(() => adminUsers.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Feature Flags table
export const featureFlags = pgTable(
  'feature_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),

    // Status
    isEnabled: boolean('is_enabled').default(false).notNull(),

    // Targeting
    targetType: text('target_type').default('all').notNull(), // 'all', 'percentage', 'users', 'companies'
    targetValue: jsonb('target_value').$type<FeatureFlagTarget>().default({}).notNull(),

    // Rollout
    rolloutPercentage: text('rollout_percentage'), // 0-100

    createdBy: uuid('created_by').references(() => adminUsers.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_feature_flags_key').on(table.key)]
)

// Usage Metrics table (for cost tracking)
export const usageMetrics = pgTable(
  'usage_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id'),

    // Period
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

    // Metrics
    metrics: jsonb('metrics').$type<UsageMetrics>().default({}).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_usage_metrics_user_id').on(table.userId),
    index('idx_usage_metrics_period').on(table.periodStart, table.periodEnd),
  ]
)

// Type definitions
export interface AdminPermissions {
  users?: {
    view?: boolean
    edit?: boolean
    delete?: boolean
    deactivate?: boolean
  }
  companies?: {
    view?: boolean
    edit?: boolean
    delete?: boolean
  }
  content?: {
    view?: boolean
    delete?: boolean
    moderate?: boolean
  }
  settings?: {
    view?: boolean
    edit?: boolean
  }
  audit?: {
    view?: boolean
    export?: boolean
  }
  metrics?: {
    view?: boolean
    export?: boolean
  }
}

export interface FeatureFlagTarget {
  userIds?: string[]
  companyIds?: string[]
  emails?: string[]
  emailDomains?: string[]
}

export interface UsageMetrics {
  // API calls
  apiCalls?: number

  // AI usage
  textGenerations?: number
  imageAnalyses?: number
  embeddings?: number

  // Tokens
  totalTokens?: number
  inputTokens?: number
  outputTokens?: number

  // Costs
  totalCostUsd?: number
  textCostUsd?: number
  visionCostUsd?: number
  embeddingCostUsd?: number

  // Storage
  photosUploaded?: number
  storageUsedMb?: number

  // Sync
  syncJobsRun?: number
}

// Infer types
export type AdminUser = typeof adminUsers.$inferSelect
export type NewAdminUser = typeof adminUsers.$inferInsert
export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
export type SystemSetting = typeof systemSettings.$inferSelect
export type FeatureFlag = typeof featureFlags.$inferSelect
export type UsageMetric = typeof usageMetrics.$inferSelect
