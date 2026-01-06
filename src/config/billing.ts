// Subscription Plans
export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Basic features to get started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    trialDays: 0,
    features: {
      generationsPerMonth: 10,
      contexts: 1, // Only one context (LinkedIn OR Dating OR Bio)
      photoScoring: true,
      photoOptimization: false,
      advancedIdentityTuning: false,
      presetsAndExports: false,
      historyVersioning: false,
      companyFeatures: false,
      multiContextSameModule: false,
      multiContextAllModules: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Advanced features for individuals',
    monthlyPrice: 2900, // $29 in cents
    yearlyPrice: 24900, // $249 in cents
    stripePriceIdMonthly: 'price_1SmGXJAAWsLUgbZIvMGXfKk', // Provided by client
    stripePriceIdYearly: null, // To be created in Stripe
    trialDays: 7,
    features: {
      generationsPerMonth: 300,
      contexts: -1, // Unlimited within same module
      photoScoring: true,
      photoOptimization: true,
      advancedIdentityTuning: true,
      presetsAndExports: true,
      historyVersioning: true,
      companyFeatures: false,
      multiContextSameModule: true,
      multiContextAllModules: false,
    },
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    description: 'Full access with company features',
    monthlyPrice: 9900, // $99 in cents
    yearlyPrice: 99900, // $999 in cents
    stripePriceIdMonthly: null, // To be created in Stripe
    stripePriceIdYearly: null, // To be created in Stripe
    trialDays: 0, // No trial for Elite (premium positioning)
    features: {
      generationsPerMonth: -1, // Unlimited (fair use)
      contexts: -1, // Unlimited
      photoScoring: true,
      photoOptimization: true,
      advancedIdentityTuning: true,
      presetsAndExports: true,
      historyVersioning: true,
      companyFeatures: true,
      multiContextSameModule: true,
      multiContextAllModules: true,
    },
  },
} as const

export type PlanId = keyof typeof SUBSCRIPTION_PLANS
export type Plan = (typeof SUBSCRIPTION_PLANS)[PlanId]

// Billing intervals
export const BILLING_INTERVALS = ['monthly', 'yearly'] as const
export type BillingInterval = (typeof BILLING_INTERVALS)[number]

// Subscription statuses (matches Stripe)
export const SUBSCRIPTION_STATUSES = [
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'paused',
  'trialing',
  'unpaid',
] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

// Generation types for usage tracking
export const GENERATION_TYPES = [
  'bio',
  'resume',
  'cover_letter',
  'dating_profile',
  'dating_prompt',
  'photo_optimization',
  'aesthetic_analysis',
  'voice_feedback',
] as const
export type GenerationType = (typeof GENERATION_TYPES)[number]

// Context types
export const CONTEXT_TYPES = ['linkedin', 'dating', 'social', 'professional', 'custom'] as const
export type ContextType = (typeof CONTEXT_TYPES)[number]

// Fair use limit for Elite plan (soft limit for abuse prevention)
export const ELITE_FAIR_USE_LIMIT = 1000

// Helper functions
export function getPlanById(planId: string): Plan | null {
  return SUBSCRIPTION_PLANS[planId as PlanId] || null
}

export function getPlanByPriceId(priceId: string): Plan | null {
  for (const plan of Object.values(SUBSCRIPTION_PLANS)) {
    if (plan.stripePriceIdMonthly === priceId || plan.stripePriceIdYearly === priceId) {
      return plan
    }
  }
  return null
}

export function getGenerationLimit(planId: PlanId): number {
  const plan = SUBSCRIPTION_PLANS[planId]
  return plan.features.generationsPerMonth
}

export function canAccessFeature(planId: PlanId, feature: keyof Plan['features']): boolean {
  const plan = SUBSCRIPTION_PLANS[planId]
  const value = plan.features[feature]
  // For numeric values, -1 means unlimited, any positive means access
  if (typeof value === 'number') {
    return value === -1 || value > 0
  }
  return value === true
}

export function isUnlimited(planId: PlanId, feature: keyof Plan['features']): boolean {
  const plan = SUBSCRIPTION_PLANS[planId]
  const value = plan.features[feature]
  return value === -1
}
