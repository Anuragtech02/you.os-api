import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

// Companies table (for B2B multi-tenant)
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  domain: text('domain'),

  // Branding
  logoUrl: text('logo_url'),
  brandColors: jsonb('brand_colors').$type<BrandColors>().default({}).notNull(),

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

// Type definitions
export interface BrandColors {
  primary?: string
  secondary?: string
  accent?: string
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
