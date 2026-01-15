import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { sendSuccess, sendError, ErrorCodes } from '../../utils/response'
import { checkoutSchema, cancelSchema, contextSchema } from './schemas'
import * as BillingService from '../../services/billing'
import { handleWebhookEvent } from '../../services/billing/webhooks'
import { stripe, isStripeConfigured } from '../../services/billing/stripe'
import { SUBSCRIPTION_PLANS } from '../../config/billing'
import { env } from '../../config/env'

export default async function billingRoutes(fastify: FastifyInstance) {
  // Middleware to check if Stripe is configured
  const requireStripe = async (_request: FastifyRequest, reply: FastifyReply) => {
    if (!isStripeConfigured) {
      return sendError(
        reply,
        ErrorCodes.SERVICE_UNAVAILABLE,
        'Billing is not configured. Please set STRIPE_SECRET_KEY.',
        503
      )
    }
  }
  // ============================================================================
  // Public Endpoints
  // ============================================================================

  /**
   * GET /billing/plans
   * List all subscription plans with features
   */
  fastify.get('/plans', async (_request: FastifyRequest, reply: FastifyReply) => {
    const plans = Object.values(SUBSCRIPTION_PLANS).map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      trialDays: plan.trialDays,
      features: plan.features,
    }))

    return sendSuccess(reply, { plans })
  })

  /**
   * GET /billing/config
   * Get Stripe publishable key for frontend
   */
  fastify.get('/config', async (_request: FastifyRequest, reply: FastifyReply) => {
    return sendSuccess(reply, {
      publishableKey: env.STRIPE_PUBLISHABLE_KEY || null,
      configured: isStripeConfigured,
    })
  })

  // ============================================================================
  // Authenticated Endpoints
  // ============================================================================

  /**
   * GET /billing/subscription
   * Get user's current subscription details
   */
  fastify.get(
    '/subscription',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id

      const subscription = await BillingService.getSubscription(userId)
      const planId = await BillingService.getUserPlanId(userId)
      const plan = SUBSCRIPTION_PLANS[planId]

      return sendSuccess(reply, {
        subscription: subscription
          ? {
              id: subscription.id,
              planId: subscription.planId,
              status: subscription.status,
              billingInterval: subscription.billingInterval,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              trialStart: subscription.trialStart,
              trialEnd: subscription.trialEnd,
            }
          : null,
        plan: {
          id: plan.id,
          name: plan.name,
          features: plan.features,
        },
      })
    }
  )

  /**
   * GET /billing/usage
   * Get current period usage breakdown
   */
  fastify.get(
    '/usage',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id

      const usage = await BillingService.getUsageBreakdown(userId)
      const canGen = await BillingService.canGenerate(userId)

      return sendSuccess(reply, {
        usage: {
          total: usage.total,
          byType: usage.byType,
          periodStart: usage.periodStart,
          periodEnd: usage.periodEnd,
        },
        limits: {
          allowed: canGen.allowed,
          remaining: canGen.remaining,
          limit: canGen.limit,
          planId: canGen.planId,
        },
      })
    }
  )

  /**
   * POST /billing/checkout
   * Create a Stripe checkout session
   */
  fastify.post(
    '/checkout',
    { preHandler: [fastify.authenticate, requireStripe] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id

      const parseResult = checkoutSchema.safeParse(request.body)
      if (!parseResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      }

      const { planId, interval } = parseResult.data

      try {
        const checkoutUrl = await BillingService.createCheckoutSession(userId, planId, interval)

        return sendSuccess(reply, { checkoutUrl })
      } catch (error) {
        if (error instanceof Error && error.message.includes('not available')) {
          return sendError(reply, ErrorCodes.VALIDATION_ERROR, error.message, 400)
        }
        throw error
      }
    }
  )

  /**
   * POST /billing/portal
   * Create a Stripe customer portal session
   */
  fastify.post(
    '/portal',
    { preHandler: [fastify.authenticate, requireStripe] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id

      const portalUrl = await BillingService.createPortalSession(userId)

      return sendSuccess(reply, { portalUrl })
    }
  )

  /**
   * POST /billing/cancel
   * Cancel subscription
   */
  fastify.post(
    '/cancel',
    { preHandler: [fastify.authenticate, requireStripe] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id

      const parseResult = cancelSchema.safeParse(request.body || {})
      if (!parseResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      }

      const { immediate } = parseResult.data

      try {
        const subscription = await BillingService.cancelSubscription(userId, immediate)

        return sendSuccess(reply, {
          message: immediate
            ? 'Subscription canceled immediately'
            : 'Subscription will be canceled at the end of the billing period',
          subscription: {
            id: subscription.id,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            currentPeriodEnd: subscription.currentPeriodEnd,
          },
        })
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return sendError(reply, ErrorCodes.NOT_FOUND, 'No active subscription found', 404)
        }
        throw error
      }
    }
  )

  /**
   * POST /billing/resume
   * Resume a canceled subscription
   */
  fastify.post(
    '/resume',
    { preHandler: [fastify.authenticate, requireStripe] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id

      try {
        const subscription = await BillingService.resumeSubscription(userId)

        return sendSuccess(reply, {
          message: 'Subscription resumed',
          subscription: {
            id: subscription.id,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          },
        })
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('not found')) {
            return sendError(reply, ErrorCodes.NOT_FOUND, 'No subscription found', 404)
          }
          if (error.message.includes('not set to cancel')) {
            return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Subscription is not set to cancel', 400)
          }
        }
        throw error
      }
    }
  )

  /**
   * GET /billing/invoices
   * Get payment history
   */
  fastify.get(
    '/invoices',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id

      const invoices = await BillingService.getPaymentHistory(userId)

      return sendSuccess(reply, { invoices })
    }
  )

  /**
   * POST /billing/context
   * Set selected context for Free plan users
   */
  fastify.post(
    '/context',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id

      const parseResult = contextSchema.safeParse(request.body)
      if (!parseResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      }

      const { context } = parseResult.data

      try {
        await BillingService.setSelectedContext(userId, context)

        return sendSuccess(reply, {
          message: 'Context selected',
          context,
        })
      } catch (error) {
        if (error instanceof Error && error.message.includes('only for Free')) {
          return sendError(
            reply,
            ErrorCodes.FORBIDDEN,
            'Context selection is only available for Free plan users',
            403
          )
        }
        throw error
      }
    }
  )

  /**
   * GET /billing/context
   * Get selected context for Free plan users
   */
  fastify.get(
    '/context',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id

      const context = await BillingService.getSelectedContext(userId)

      return sendSuccess(reply, { context })
    }
  )

  // ============================================================================
  // Webhook Endpoint
  // ============================================================================

  /**
   * POST /billing/webhook
   * Handle Stripe webhook events
   */
  fastify.post(
    '/webhook',
    {
      preHandler: [requireStripe],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const sig = request.headers['stripe-signature']

      if (!sig) {
        return sendError(reply, ErrorCodes.UNAUTHORIZED, 'Missing Stripe signature', 401)
      }

      let event

      try {
        // Get raw body for signature verification
        const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody
        if (!rawBody) {
          return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Missing raw body', 400)
        }

        event = await stripe.webhooks.constructEventAsync(rawBody, sig, env.STRIPE_WEBHOOK_SECRET!)
      } catch (err) {
        console.error('Webhook signature verification failed:', err)
        return sendError(reply, ErrorCodes.UNAUTHORIZED, 'Invalid signature', 401)
      }

      // Process webhook event asynchronously
      // Return 200 immediately to prevent Stripe retries
      try {
        await handleWebhookEvent(event)
      } catch (error) {
        console.error('Webhook handler error:', error)
        // Still return 200 to prevent retries - log for investigation
      }

      return reply.status(200).send({ received: true })
    }
  )
}
