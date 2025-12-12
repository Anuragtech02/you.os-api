import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// Enums
export const accountTypeEnum = pgEnum('account_type', ['individual', 'company'])

// Users table (extends Supabase auth.users)
// Note: authId references auth.users(id) but Drizzle can't reference external schemas directly
// This foreign key constraint is handled in the manual SQL migration
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  authId: uuid('auth_id').notNull().unique(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  accountType: accountTypeEnum('account_type').default('individual').notNull(),
  companyId: uuid('company_id'),
  preferences: jsonb('preferences').$type<UserPreferences>().default({}),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

// Type definitions
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  notifications?: boolean
  language?: string
  timezone?: string
}

// Infer types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
