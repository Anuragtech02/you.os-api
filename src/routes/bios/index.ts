/**
 * Bio Generator Routes
 *
 * API endpoints for generating and managing bios.
 */

import type { FastifyInstance } from 'fastify'
import * as BioService from '@/services/modules/bio-generator'
import * as BillingService from '@/services/billing'
import { ApiError } from '@/utils/errors'
import { ErrorCodes, sendError, sendSuccess } from '@/utils/response'
import {
  bioIdSchema,
  generateBioSchema,
  generateDatingPromptSchema,
  listBiosQuerySchema,
  regenerateSchema,
} from './schemas'

export async function bioRoutes(fastify: FastifyInstance) {
  // =========================================
  // Generation
  // =========================================

  /**
   * POST /bios/generate - Generate bio for a platform
   */
  fastify.post<{ Body: unknown }>(
    '/generate',
    { preHandler: [fastify.authenticate, fastify.checkGenerationLimit('bio')] },
    async (request, reply) => {
      const bodyResult = generateBioSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return sendError(
          reply,
          ErrorCodes.VALIDATION_ERROR,
          'Invalid request body',
          400,
          { errors: bodyResult.error.flatten().fieldErrors }
        )
      }

      try {
        const result = await BioService.generateBio(request.user!.id, bodyResult.data)

        // Record usage after successful generation
        await BillingService.recordUsage(request.user!.id, 'bio')

        return sendSuccess(reply, {
          variations: result.variations,
          platform: result.platform,
          model: result.model,
          generationId: result.generationId,
          billing: request.billingContext,
        }, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Bio generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate bio', 500)
      }
    }
  )

  /**
   * POST /bios/dating-prompt - Generate dating prompt answer
   */
  fastify.post<{ Body: unknown }>(
    '/dating-prompt',
    { preHandler: [fastify.authenticate, fastify.checkGenerationLimit('dating_prompt')] },
    async (request, reply) => {
      const bodyResult = generateDatingPromptSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return sendError(
          reply,
          ErrorCodes.VALIDATION_ERROR,
          'Invalid request body',
          400,
          { errors: bodyResult.error.flatten().fieldErrors }
        )
      }

      try {
        const result = await BioService.generateDatingPromptAnswer(request.user!.id, bodyResult.data)

        // Record usage after successful generation
        await BillingService.recordUsage(request.user!.id, 'dating_prompt')

        return sendSuccess(reply, {
          variations: result.variations,
          platform: result.platform,
          model: result.model,
          generationId: result.generationId,
          billing: request.billingContext,
        }, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Dating prompt generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate dating prompt answer', 500)
      }
    }
  )

  // =========================================
  // CRUD Operations
  // =========================================

  /**
   * GET /bios - List generated bios
   */
  fastify.get<{ Querystring: Record<string, string> }>(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const queryResult = listBiosQuerySchema.safeParse(request.query)
      const query = queryResult.success
        ? queryResult.data
        : { limit: 20, offset: 0 }

      const { bios, total } = await BioService.listGeneratedBios(request.user!.id, {
        platform: query.platform,
        limit: query.limit,
        offset: query.offset,
      })

      return sendSuccess(
        reply,
        { bios },
        200,
        {
          total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + bios.length < total,
        }
      )
    }
  )

  /**
   * GET /bios/:id - Get a specific bio
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = bioIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid bio ID', 400)
      }

      const bio = await BioService.getGeneratedBio(request.params.id, request.user!.id)
      if (!bio) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Bio not found', 404)
      }

      return sendSuccess(reply, { bio })
    }
  )

  /**
   * DELETE /bios/:id - Delete a bio
   */
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = bioIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid bio ID', 400)
      }

      try {
        await BioService.deleteGeneratedBio(request.params.id, request.user!.id)
        return sendSuccess(reply, { message: 'Bio deleted successfully' })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to delete bio', 500)
      }
    }
  )

  /**
   * POST /bios/:id/regenerate - Regenerate with feedback
   */
  fastify.post<{ Params: { id: string }; Body: unknown }>(
    '/:id/regenerate',
    { preHandler: [fastify.authenticate, fastify.checkGenerationLimit('bio')] },
    async (request, reply) => {
      const idResult = bioIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid bio ID', 400)
      }

      const bodyResult = regenerateSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return sendError(
          reply,
          ErrorCodes.VALIDATION_ERROR,
          'Invalid request body',
          400,
          { errors: bodyResult.error.flatten().fieldErrors }
        )
      }

      try {
        const result = await BioService.regenerateBio(
          request.params.id,
          request.user!.id,
          bodyResult.data.feedback
        )

        // Record usage after successful generation
        await BillingService.recordUsage(request.user!.id, 'bio')

        return sendSuccess(reply, {
          variations: result.variations,
          platform: result.platform,
          model: result.model,
          generationId: result.generationId,
          billing: request.billingContext,
        }, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Bio regeneration error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to regenerate bio', 500)
      }
    }
  )

  // =========================================
  // Utilities
  // =========================================

  /**
   * GET /bios/platforms - List supported platforms
   */
  fastify.get('/platforms', async (_request, reply) => {
    const platforms = BioService.getSupportedPlatforms()
    return sendSuccess(reply, { platforms })
  })
}
