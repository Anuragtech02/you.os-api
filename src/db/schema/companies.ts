import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

// Enums
export const companyActivityTypeEnum = pgEnum('company_activity_type', [
  'member_joined',
  'identity_completed',
  'first_photo',
  'first_bio',
  'content_generated',
])

// Companies table (for B2B multi-tenant)
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  domain: text('domain'),

  // Branding
  logoUrl: text('logo_url'),
  brandColors: jsonb('brand_colors').$type<BrandColors>().default({}).notNull(),
  brandGuidelines: jsonb('brand_guidelines').$type<BrandGuidelines>(),

  // Settings
  settings: jsonb('settings').$type<CompanySettings>().default({}).notNull(),

  // Billing
  subscriptionTier: text('subscription_tier').default('starter').notNull(),
  subscriptionStatus: text('subscription_status').default('active').notNull(),

  // Admin
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),

  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Company Candidates table (employees/candidates managed by company)
export const companyCandidates = pgTable(
  'company_candidates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Role in company
    role: text('role').default('candidate').notNull(), // 'admin', 'manager', 'candidate'

    // Company-specific profile
    department: text('department'),
    title: text('title'),

    // Permissions
    permissions: jsonb('permissions').$type<CandidatePermissions>().default({}).notNull(),

    isActive: boolean('is_active').default(true).notNull(),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_company_candidates_company').on(table.companyId),
    index('idx_company_candidates_user').on(table.userId),
  ]
)

// Company Invites table
export const companyInvites = pgTable(
  'company_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // Invite details
    email: text('email').notNull(),
    role: text('role').default('employee').notNull(), // 'admin', 'manager', 'employee'
    token: text('token').notNull().unique(),

    // Status
    status: text('status').default('pending').notNull(), // pending, accepted, expired, revoked
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

    // Tracking
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id),
    acceptedBy: uuid('accepted_by').references(() => users.id),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_company_invites_company').on(table.companyId),
    index('idx_company_invites_token').on(table.token),
    index('idx_company_invites_email').on(table.email),
  ]
)

// Company Activities table - tracks significant events for admin dashboard
export const companyActivities = pgTable(
  'company_activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

    // Activity details
    type: companyActivityTypeEnum('type').notNull(),
    metadata: jsonb('metadata').$type<CompanyActivityMetadata>().default({}).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_company_activities_company').on(table.companyId),
    index('idx_company_activities_user').on(table.userId),
    index('idx_company_activities_type').on(table.type),
    index('idx_company_activities_created').on(table.createdAt),
  ]
)

// Type definitions
export interface BrandColors {
  primary?: string
  secondary?: string
  accent?: string
}

export interface BrandGuidelines {
  voiceTone?: 'professional' | 'casual' | 'technical' | 'friendly'
  toneAttributes?: string[]
  industry?: string
  targetAudience?: string
  keyMessaging?: string
  wordsToAvoid?: string[]
  wordsToInclude?: string[]
  communicationStyle?: 'formal' | 'informal' | 'balanced'
}

export interface CompanyActivityMetadata {
  userName?: string
  userAvatarUrl?: string
  contentType?: string
  platform?: string
  details?: string
}

export interface CompanySettings {
  allowedModules?: string[]
  maxCandidates?: number
  customBranding?: boolean
  ssoEnabled?: boolean
  domainRestriction?: boolean
}

export interface CandidatePermissions {
  canEditProfile?: boolean
  canViewAnalytics?: boolean
  canExportData?: boolean
  canInviteOthers?: boolean
}

// Infer types
export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert
export type CompanyCandidate = typeof companyCandidates.$inferSelect
export type NewCompanyCandidate = typeof companyCandidates.$inferInsert
export type CompanyInvite = typeof companyInvites.$inferSelect
export type NewCompanyInvite = typeof companyInvites.$inferInsert
export type CompanyActivity = typeof companyActivities.$inferSelect
export type NewCompanyActivity = typeof companyActivities.$inferInsert
export type CompanyActivityType = 'member_joined' | 'identity_completed' | 'first_photo' | 'first_bio' | 'content_generated'
