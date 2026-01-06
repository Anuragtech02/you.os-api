import type { FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import * as BillingService from '../services/billing'
import { SUBSCRIPTION_PLANS, type PlanId } from '../config/billing'
import type { GenerationType } from '../db/schema/billing'
import { sendError, ErrorCodes } from '../utils/response'

// Extend FastifyInstance with billing decorators
declare module 'fastify' {
  interface FastifyInstance {
    checkGenerationLimit: (
      generationType: GenerationType
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    checkPlanFeature: (
      feature: keyof typeof SUBSCRIPTION_PLANS.free.features
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    checkCompanyAccess: () => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    recordUsage: (
      generationType: GenerationType
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }

  interface FastifyRequest {
    billingContext?: {
      planId: PlanId
      remaining: number
      limit: number
      allowed: boolean
    }
  }
}

async function billingPlugin(fastify: FastifyInstance) {
  /**
   * Middleware to check if user has remaining generations
   * Use this BEFORE processing generation requests
   */
  fastify.decorate(
    'checkGenerationLimit',
    (generationType: GenerationType) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user) {
          return sendError(reply, ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
        }

        const result = await BillingService.canGenerate(request.user.id)

        // Attach billing context to request for later use
        request.billingContext = {
          planId: result.planId,
          remaining: result.remaining,
          limit: result.limit,
          allowed: result.allowed,
        }

        if (!result.allowed) {
          return sendError(
            reply,
            ErrorCodes.FORBIDDEN,
            'Generation limit reached for this billing period',
            403,
            {
              planId: result.planId,
              limit: result.limit,
              remaining: 0,
              upgradeUrl: '/billing',
              message:
                result.planId === 'free'
                  ? 'Upgrade to Pro for 300 generations/month'
                  : 'Upgrade to Elite for unlimited generations',
            }
          )
        }

        // For free plan, check context restrictions
        if (result.planId === 'free') {
          const selectedContext = await BillingService.getSelectedContext(request.user.id)

          // Map generation type to context
          const contextMap: Record<string, string> = {
            bio: 'bio',
            dating_profile: 'dating',
            dating_prompt: 'dating',
            resume: 'linkedin',
            cover_letter: 'linkedin',
          }

          const requiredContext = contextMap[generationType]

          if (requiredContext && selectedContext && selectedContext !== requiredContext) {
            return sendError(
              reply,
              ErrorCodes.FORBIDDEN,
              `Free plan is limited to ${selectedContext} context only`,
              403,
              {
                selectedContext,
                requiredContext,
                message: 'Upgrade to Pro to access multiple contexts',
              }
            )
          }

          // If no context selected yet, prompt to select
          if (requiredContext && !selectedContext) {
            return sendError(
              reply,
              ErrorCodes.FORBIDDEN,
              'Please select your context before generating content',
              403,
              {
                availableContexts: ['linkedin', 'dating', 'bio'],
                endpoint: '/billing/context',
                message: 'Free plan requires selecting one context to use',
              }
            )
          }
        }
      }
  )

  /**
   * Middleware to check if user's plan has a specific feature
   */
  fastify.decorate(
    'checkPlanFeature',
    (feature: keyof typeof SUBSCRIPTION_PLANS.free.features) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user) {
          return sendError(reply, ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
        }

        const hasAccess = await BillingService.canAccessFeature(request.user.id, feature)

        if (!hasAccess) {
          const planId = await BillingService.getUserPlanId(request.user.id)

          // Determine which plan is needed for this feature
          let requiredPlan: string = 'Pro'
          if (feature === 'companyFeatures' || feature === 'multiContextAllModules') {
            requiredPlan = 'Elite'
          }

          return sendError(
            reply,
            ErrorCodes.FORBIDDEN,
            `This feature requires ${requiredPlan} plan`,
            403,
            {
              feature,
              currentPlan: planId,
              requiredPlan,
              upgradeUrl: '/billing',
            }
          )
        }
      }
  )

  /**
   * Middleware to check company feature access (Elite only)
   */
  fastify.decorate(
    'checkCompanyAccess',
    () => async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        return sendError(reply, ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
      }

      const hasAccess = await BillingService.canUseCompanyFeatures(request.user.id)

      if (!hasAccess) {
        const planId = await BillingService.getUserPlanId(request.user.id)

        return sendError(
          reply,
          ErrorCodes.FORBIDDEN,
          'Company features require Elite plan',
          403,
          {
            feature: 'companyFeatures',
            currentPlan: planId,
            requiredPlan: 'Elite',
            upgradeUrl: '/billing',
          }
        )
      }
    }
  )

  /**
   * Middleware to record usage after successful generation
   * Use this as an onSend hook or call manually after success
   */
  fastify.decorate(
    'recordUsage',
    (generationType: GenerationType) =>
      async (request: FastifyRequest, _reply: FastifyReply) => {
        if (!request.user) return

        try {
          await BillingService.recordUsage(request.user.id, generationType)
        } catch (error) {
          // Log but don't fail the request
          fastify.log.error(error, 'Failed to record usage')
        }
      }
  )
}

export default fp(billingPlugin, {
  name: 'billing',
  dependencies: ['auth'],
})

export { billingPlugin }
