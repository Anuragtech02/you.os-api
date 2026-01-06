import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '../../db/client'
import {
  subscriptions,
  usageRecords,
  paymentHistory,
  type Subscription,
  type NewSubscription,
  type PlanId,
  type SubscriptionStatus,
  type BillingInterval,
  type GenerationType,
} from '../../db/schema/billing'
import { users } from '../../db/schema/users'
import { Errors } from '../../utils/errors'
import { stripe } from './stripe'
import {
  SUBSCRIPTION_PLANS,
  getPlanById,
  getPlanByPriceId,
  getGenerationLimit,
  ELITE_FAIR_USE_LIMIT,
} from '../../config/billing'
import { env } from '../../config/env'

// ============================================================================
// Customer Management
// ============================================================================

/**
 * Create a Stripe customer for a user
 */
export async function createStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      userId,
    },
  })

  // Update user with Stripe customer ID
  await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, userId))

  return customer.id
}

/**
 * Get or create Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

  if (!user) {
    throw Errors.notFound('User')
  }

  if (user.stripeCustomerId) {
    return user.stripeCustomerId
  }

  return createStripeCustomer(userId, user.email, user.fullName || undefined)
}

// ============================================================================
// Subscription Management
// ============================================================================

/**
 * Get user's current subscription
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)

  return subscription || null
}

/**
 * Get user's plan ID (defaults to 'free' if no subscription)
 */
export async function getUserPlanId(userId: string): Promise<PlanId> {
  const subscription = await getSubscription(userId)

  if (!subscription) {
    return 'free'
  }

  // Check if subscription is active
  const activeStatuses: SubscriptionStatus[] = ['active', 'trialing']
  if (!activeStatuses.includes(subscription.status)) {
    return 'free'
  }

  return subscription.planId
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  userId: string,
  planId: PlanId,
  interval: BillingInterval
): Promise<string> {
  if (planId === 'free') {
    throw Errors.validation('Cannot checkout for free plan')
  }

  const plan = getPlanById(planId)
  if (!plan) {
    throw Errors.validation('Invalid plan')
  }

  const priceId = interval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly

  if (!priceId) {
    throw Errors.validation(`${interval} billing not available for ${planId} plan`)
  }

  const customerId = await getOrCreateStripeCustomer(userId)

  const sessionConfig: {
    customer: string
    mode: 'subscription'
    line_items: Array<{ price: string; quantity: number }>
    success_url: string
    cancel_url: string
    metadata: Record<string, string>
    subscription_data: {
      metadata: Record<string, string>
      trial_period_days?: number
    }
  } = {
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.FRONTEND_URL}/billing/cancel`,
    metadata: {
      userId,
      planId,
      interval,
    },
    subscription_data: {
      metadata: {
        userId,
        planId,
      },
    },
  }

  // Add trial for Pro plan only
  if (planId === 'pro' && plan.trialDays > 0) {
    sessionConfig.subscription_data.trial_period_days = plan.trialDays
  }

  const session = await stripe.checkout.sessions.create(sessionConfig)

  if (!session.url) {
    throw Errors.internal('Failed to create checkout session')
  }

  return session.url
}

/**
 * Create a customer portal session
 */
export async function createPortalSession(userId: string): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(userId)

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.FRONTEND_URL}/settings/billing`,
  })

  return session.url
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  userId: string,
  immediate: boolean = false
): Promise<Subscription> {
  const subscription = await getSubscription(userId)

  if (!subscription || !subscription.stripeSubscriptionId) {
    throw Errors.notFound('Subscription')
  }

  if (immediate) {
    // Cancel immediately
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
  } else {
    // Cancel at period end
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
  }

  // Update local record
  const [updated] = await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: !immediate,
      status: immediate ? 'canceled' : subscription.status,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id))
    .returning()

  if (!updated) {
    throw Errors.internal('Failed to update subscription')
  }

  return updated
}

/**
 * Resume a canceled subscription (if cancel_at_period_end was set)
 */
export async function resumeSubscription(userId: string): Promise<Subscription> {
  const subscription = await getSubscription(userId)

  if (!subscription || !subscription.stripeSubscriptionId) {
    throw Errors.notFound('Subscription')
  }

  if (!subscription.cancelAtPeriodEnd) {
    throw Errors.validation('Subscription is not set to cancel')
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
  })

  const [updated] = await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id))
    .returning()

  if (!updated) {
    throw Errors.internal('Failed to update subscription')
  }

  return updated
}

/**
 * Create or update subscription from Stripe data
 */
export async function syncSubscriptionFromStripe(
  stripeSubscription: {
    id: string
    customer: string | { id: string }
    status: string
    items: { data: Array<{ price: { id: string } }> }
    current_period_start: number
    current_period_end: number
    cancel_at_period_end: boolean
    trial_start?: number | null
    trial_end?: number | null
    metadata?: { userId?: string; planId?: string }
  }
): Promise<Subscription> {
  const customerId = typeof stripeSubscription.customer === 'string'
    ? stripeSubscription.customer
    : stripeSubscription.customer.id

  // Find user by Stripe customer ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1)

  if (!user) {
    throw Errors.notFound('User', 'No user found for Stripe customer')
  }

  const priceId = stripeSubscription.items.data[0]?.price.id
  const plan = priceId ? getPlanByPriceId(priceId) : null
  const planId = (plan?.id as PlanId) || (stripeSubscription.metadata?.planId as PlanId) || 'pro'

  // Determine billing interval from price
  const isYearly = plan?.stripePriceIdYearly === priceId
  const billingInterval: BillingInterval = isYearly ? 'yearly' : 'monthly'

  const subscriptionData: Partial<NewSubscription> = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: stripeSubscription.id,
    stripePriceId: priceId,
    planId,
    status: stripeSubscription.status as SubscriptionStatus,
    billingInterval,
    currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    trialStart: stripeSubscription.trial_start
      ? new Date(stripeSubscription.trial_start * 1000)
      : null,
    trialEnd: stripeSubscription.trial_end
      ? new Date(stripeSubscription.trial_end * 1000)
      : null,
    updatedAt: new Date(),
  }

  // Check if subscription exists
  const existing = await getSubscription(user.id)

  if (existing) {
    const [updated] = await db
      .update(subscriptions)
      .set(subscriptionData)
      .where(eq(subscriptions.id, existing.id))
      .returning()

    if (!updated) {
      throw Errors.internal('Failed to update subscription')
    }
    return updated
  }

  // Create new subscription
  const [created] = await db
    .insert(subscriptions)
    .values({
      ...subscriptionData,
      userId: user.id,
      stripeCustomerId: customerId,
    } as NewSubscription)
    .returning()

  if (!created) {
    throw Errors.internal('Failed to create subscription')
  }

  return created
}

/**
 * Create free subscription for new user
 */
export async function createFreeSubscription(userId: string): Promise<Subscription> {
  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  // Create a Stripe customer for the user (for future upgrades)
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) {
    throw Errors.notFound('User')
  }

  const customerId = await getOrCreateStripeCustomer(userId)

  const [subscription] = await db
    .insert(subscriptions)
    .values({
      userId,
      stripeCustomerId: customerId,
      planId: 'free',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    })
    .returning()

  if (!subscription) {
    throw Errors.internal('Failed to create subscription')
  }

  return subscription
}

// ============================================================================
// Usage Tracking
// ============================================================================

/**
 * Record a generation usage
 */
export async function recordUsage(
  userId: string,
  generationType: GenerationType
): Promise<void> {
  const subscription = await getSubscription(userId)

  const now = new Date()
  let periodStart: Date
  let periodEnd: Date

  if (subscription?.currentPeriodStart && subscription?.currentPeriodEnd) {
    periodStart = subscription.currentPeriodStart
    periodEnd = subscription.currentPeriodEnd
  } else {
    // Default to current month for free users without subscription record
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  }

  await db.insert(usageRecords).values({
    userId,
    subscriptionId: subscription?.id,
    generationType,
    count: 1,
    periodStart,
    periodEnd,
  })
}

/**
 * Get usage count for current billing period
 */
export async function getCurrentPeriodUsage(userId: string): Promise<number> {
  const subscription = await getSubscription(userId)

  let periodStart: Date
  let periodEnd: Date
  const now = new Date()

  if (subscription?.currentPeriodStart && subscription?.currentPeriodEnd) {
    periodStart = subscription.currentPeriodStart
    periodEnd = subscription.currentPeriodEnd
  } else {
    // Default to current month for free users
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  }

  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(${usageRecords.count}), 0)` })
    .from(usageRecords)
    .where(
      and(
        eq(usageRecords.userId, userId),
        gte(usageRecords.periodStart, periodStart),
        lte(usageRecords.periodEnd, periodEnd)
      )
    )

  return Number(result[0]?.total || 0)
}

/**
 * Get remaining generations for current period
 */
export async function getRemainingGenerations(userId: string): Promise<number> {
  const planId = await getUserPlanId(userId)
  const limit = getGenerationLimit(planId)

  // Unlimited
  if (limit === -1) {
    return -1
  }

  const used = await getCurrentPeriodUsage(userId)
  return Math.max(0, limit - used)
}

/**
 * Check if user can generate (has remaining quota)
 */
export async function canGenerate(userId: string): Promise<{
  allowed: boolean
  remaining: number
  limit: number
  planId: PlanId
}> {
  const planId = await getUserPlanId(userId)
  const limit = getGenerationLimit(planId)

  // Elite plan with unlimited (but check fair use)
  if (limit === -1) {
    const used = await getCurrentPeriodUsage(userId)
    // Soft fair-use limit for Elite
    if (used >= ELITE_FAIR_USE_LIMIT) {
      return {
        allowed: true, // Still allow but flag it
        remaining: -1,
        limit: -1,
        planId,
      }
    }
    return {
      allowed: true,
      remaining: -1,
      limit: -1,
      planId,
    }
  }

  const used = await getCurrentPeriodUsage(userId)
  const remaining = Math.max(0, limit - used)

  return {
    allowed: remaining > 0,
    remaining,
    limit,
    planId,
  }
}

/**
 * Get detailed usage breakdown for current period
 */
export async function getUsageBreakdown(userId: string): Promise<{
  total: number
  byType: Record<string, number>
  periodStart: Date
  periodEnd: Date
}> {
  const subscription = await getSubscription(userId)
  const now = new Date()

  let periodStart: Date
  let periodEnd: Date

  if (subscription?.currentPeriodStart && subscription?.currentPeriodEnd) {
    periodStart = subscription.currentPeriodStart
    periodEnd = subscription.currentPeriodEnd
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  }

  const records = await db
    .select({
      generationType: usageRecords.generationType,
      total: sql<number>`COALESCE(SUM(${usageRecords.count}), 0)`,
    })
    .from(usageRecords)
    .where(
      and(
        eq(usageRecords.userId, userId),
        gte(usageRecords.periodStart, periodStart),
        lte(usageRecords.periodEnd, periodEnd)
      )
    )
    .groupBy(usageRecords.generationType)

  const byType: Record<string, number> = {}
  let total = 0

  for (const record of records) {
    byType[record.generationType] = Number(record.total)
    total += Number(record.total)
  }

  return {
    total,
    byType,
    periodStart,
    periodEnd,
  }
}

// ============================================================================
// Payment History
// ============================================================================

/**
 * Record a payment from Stripe invoice
 */
export async function recordPayment(
  invoice: {
    id: string
    customer: string | { id: string }
    payment_intent?: string | { id: string } | null
    amount_paid: number
    currency: string
    status: string
    hosted_invoice_url?: string | null
  }
): Promise<void> {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer.id

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1)

  if (!user) {
    console.error('No user found for customer:', customerId)
    return
  }

  const subscription = await getSubscription(user.id)

  const paymentIntentId = invoice.payment_intent
    ? (typeof invoice.payment_intent === 'string'
        ? invoice.payment_intent
        : invoice.payment_intent.id)
    : null

  await db.insert(paymentHistory).values({
    userId: user.id,
    subscriptionId: subscription?.id,
    stripeInvoiceId: invoice.id,
    stripePaymentIntentId: paymentIntentId,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: invoice.status === 'paid' ? 'succeeded' : 'failed',
    receiptUrl: invoice.hosted_invoice_url,
  })
}

/**
 * Get payment history for user
 */
export async function getPaymentHistory(
  userId: string,
  limit: number = 10
): Promise<Array<{
  id: string
  amount: number
  currency: string
  status: string
  receiptUrl: string | null
  createdAt: Date
}>> {
  const payments = await db
    .select({
      id: paymentHistory.id,
      amount: paymentHistory.amount,
      currency: paymentHistory.currency,
      status: paymentHistory.status,
      receiptUrl: paymentHistory.receiptUrl,
      createdAt: paymentHistory.createdAt,
    })
    .from(paymentHistory)
    .where(eq(paymentHistory.userId, userId))
    .orderBy(sql`${paymentHistory.createdAt} DESC`)
    .limit(limit)

  return payments
}

// ============================================================================
// Context Selection (Free Plan)
// ============================================================================

/**
 * Set selected context for Free plan users
 */
export async function setSelectedContext(
  userId: string,
  context: 'linkedin' | 'dating' | 'bio'
): Promise<void> {
  const planId = await getUserPlanId(userId)

  if (planId !== 'free') {
    throw Errors.validation('Context selection is only for Free plan users')
  }

  await db
    .update(users)
    .set({ selectedContext: context })
    .where(eq(users.id, userId))
}

/**
 * Get selected context for user
 */
export async function getSelectedContext(
  userId: string
): Promise<'linkedin' | 'dating' | 'bio' | null> {
  const [user] = await db
    .select({ selectedContext: users.selectedContext })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return user?.selectedContext || null
}

// ============================================================================
// Feature Access
// ============================================================================

/**
 * Check if user can access a feature
 */
export async function canAccessFeature(
  userId: string,
  feature: keyof typeof SUBSCRIPTION_PLANS.free.features
): Promise<boolean> {
  const planId = await getUserPlanId(userId)
  const plan = SUBSCRIPTION_PLANS[planId]

  const value = plan.features[feature]
  if (typeof value === 'boolean') {
    return value
  }
  // For numeric values, -1 means unlimited, any positive number means access
  return value === -1 || value > 0
}

/**
 * Check if user can use company features (Elite only)
 */
export async function canUseCompanyFeatures(userId: string): Promise<boolean> {
  return canAccessFeature(userId, 'companyFeatures')
}

/**
 * Check if user can optimize photos (Pro+ only)
 */
export async function canOptimizePhotos(userId: string): Promise<boolean> {
  return canAccessFeature(userId, 'photoOptimization')
}
