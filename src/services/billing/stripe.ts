import Stripe from 'stripe'
import { env } from '../../config/env'

// Check if Stripe is configured
export const isStripeConfigured = Boolean(env.STRIPE_SECRET_KEY)

// Initialize Stripe with the secret key (or dummy if not configured)
export const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_placeholder')

// Re-export types for convenience
export type { Stripe }
