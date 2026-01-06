import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

// Enums
export const planIdEnum = pgEnum('plan_id', ['free', 'pro', 'elite'])
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'paused',
  'trialing',
  'unpaid',
])
export const billingIntervalEnum = pgEnum('billing_interval', ['monthly', 'yearly'])
export const paymentStatusEnum = pgEnum('payment_status', ['succeeded', 'failed', 'pending', 'refunded'])
export const generationTypeEnum = pgEnum('generation_type', [
  'bio',
  'resume',
  'cover_letter',
  'dating_profile',
  'dating_prompt',
  'photo_optimization',
  'aesthetic_analysis',
  'voice_feedback',
])

// Subscriptions table
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Stripe IDs
    stripeCustomerId: text('stripe_customer_id').notNull(),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    stripePriceId: text('stripe_price_id'),

    // Plan details
    planId: planIdEnum('plan_id').notNull().default('free'),
    status: subscriptionStatusEnum('status').notNull().default('active'),
    billingInterval: billingIntervalEnum('billing_interval').default('monthly'),

    // Billing period
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),

    // Trial
    trialStart: timestamp('trial_start', { withTimezone: true }),
    trialEnd: timestamp('trial_end', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_subscriptions_user').on(table.userId),
    index('idx_subscriptions_stripe_customer').on(table.stripeCustomerId),
    index('idx_subscriptions_stripe_subscription').on(table.stripeSubscriptionId),
    index('idx_subscriptions_status').on(table.status),
  ]
)

// Usage records table - tracks generations per billing period
export const usageRecords = pgTable(
  'usage_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),

    // Generation details
    generationType: generationTypeEnum('generation_type').notNull(),
    count: integer('count').notNull().default(1),

    // Billing period this usage belongs to
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_usage_records_user').on(table.userId),
    index('idx_usage_records_subscription').on(table.subscriptionId),
    index('idx_usage_records_period').on(table.periodStart, table.periodEnd),
    index('idx_usage_records_user_period').on(table.userId, table.periodStart, table.periodEnd),
  ]
)

// Payment history table
export const paymentHistory = pgTable(
  'payment_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),

    // Stripe IDs
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    stripeInvoiceId: text('stripe_invoice_id'),

    // Payment details
    amount: integer('amount').notNull(), // In cents
    currency: text('currency').notNull().default('usd'),
    status: paymentStatusEnum('status').notNull(),
    receiptUrl: text('receipt_url'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_payment_history_user').on(table.userId),
    index('idx_payment_history_subscription').on(table.subscriptionId),
    index('idx_payment_history_created').on(table.createdAt),
  ]
)

// Infer types
export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
export type UsageRecord = typeof usageRecords.$inferSelect
export type NewUsageRecord = typeof usageRecords.$inferInsert
export type PaymentHistoryRecord = typeof paymentHistory.$inferSelect
export type NewPaymentHistoryRecord = typeof paymentHistory.$inferInsert

export type PlanId = 'free' | 'pro' | 'elite'
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'unpaid'
export type BillingInterval = 'monthly' | 'yearly'
export type PaymentStatus = 'succeeded' | 'failed' | 'pending' | 'refunded'
export type GenerationType =
  | 'bio'
  | 'resume'
  | 'cover_letter'
  | 'dating_profile'
  | 'dating_prompt'
  | 'photo_optimization'
  | 'aesthetic_analysis'
  | 'voice_feedback'
