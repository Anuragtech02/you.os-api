import Stripe from 'stripe'
import { env } from '../../config/env'

// Initialize Stripe with the secret key
export const stripe = new Stripe(env.STRIPE_SECRET_KEY)

// Re-export types for convenience
export type { Stripe }
