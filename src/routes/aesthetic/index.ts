/**
 * Aesthetic Module Routes
 *
 * API endpoints for personal styling and aesthetic recommendations.
 */

import type { FastifyInstance } from 'fastify'
import * as AestheticService from '@/services/modules/aesthetic'
import { ApiError } from '@/utils/errors'
import { ErrorCodes, sendError, sendSuccess } from '@/utils/response'
import {
  generateColorPaletteSchema,
  generateHairSchema,
  generateMakeupSchema,
  generateStylingSchema,
  generateWardrobeSchema,
  updatePreferencesSchema,
} from './schemas'

export async function aestheticRoutes(fastify: FastifyInstance) {
  // =========================================
  // Full Aesthetic Analysis
  // =========================================

  /**
   * GET /aesthetic - Get aesthetic profile
   */
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const profile = await AestheticService.getAestheticProfile(request.user!.id)

        return sendSuccess(reply, profile)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Get aesthetic profile error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to get aesthetic profile', 500)
      }
    }
  )

  /**
   * POST /aesthetic/analyze - Run full aesthetic analysis
   */
  fastify.post(
    '/analyze',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const result = await AestheticService.analyzeFullAesthetic(request.user!.id)

        return sendSuccess(reply, result, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Full aesthetic analysis error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to analyze aesthetic', 500)
      }
    }
  )

  /**
   * PATCH /aesthetic - Update aesthetic preferences
   */
  fastify.patch<{ Body: unknown }>(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = updatePreferencesSchema.safeParse(request.body)
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
        await AestheticService.updateAestheticPreferences(request.user!.id, bodyResult.data)

        return sendSuccess(reply, { message: 'Preferences updated successfully' })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to update preferences', 500)
      }
    }
  )

  // =========================================
  // Color Palette
  // =========================================

  /**
   * POST /aesthetic/colors/generate - Generate color palette
   */
  fastify.post<{ Body: unknown }>(
    '/colors/generate',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = generateColorPaletteSchema.safeParse(request.body ?? {})
      const body = bodyResult.success ? bodyResult.data : {}

      try {
        const result = await AestheticService.generateColorPalette(request.user!.id, body)

        return sendSuccess(reply, result, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Color palette generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate color palette', 500)
      }
    }
  )

  // =========================================
  // Styling Guidance
  // =========================================

  /**
   * POST /aesthetic/styling/generate - Generate styling guidance
   */
  fastify.post<{ Body: unknown }>(
    '/styling/generate',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = generateStylingSchema.safeParse(request.body ?? {})
      const body = bodyResult.success ? bodyResult.data : {}

      try {
        const result = await AestheticService.generateStylingGuidance(request.user!.id, body)

        return sendSuccess(reply, result, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Styling guidance generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate styling guidance', 500)
      }
    }
  )

  // =========================================
  // Hair Suggestions
  // =========================================

  /**
   * POST /aesthetic/hair/generate - Generate hair suggestions
   */
  fastify.post<{ Body: unknown }>(
    '/hair/generate',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = generateHairSchema.safeParse(request.body ?? {})
      const body = bodyResult.success ? bodyResult.data : {}

      try {
        const result = await AestheticService.generateHairSuggestions(request.user!.id, body)

        return sendSuccess(reply, result, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Hair suggestions generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate hair suggestions', 500)
      }
    }
  )

  // =========================================
  // Makeup Suggestions
  // =========================================

  /**
   * POST /aesthetic/makeup/generate - Generate makeup suggestions
   */
  fastify.post<{ Body: unknown }>(
    '/makeup/generate',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = generateMakeupSchema.safeParse(request.body ?? {})
      const body = bodyResult.success ? bodyResult.data : {}

      try {
        const result = await AestheticService.generateMakeupSuggestions(request.user!.id, body)

        return sendSuccess(reply, result, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Makeup suggestions generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate makeup suggestions', 500)
      }
    }
  )

  // =========================================
  // Wardrobe Guidance
  // =========================================

  /**
   * POST /aesthetic/wardrobe/generate - Generate wardrobe guidance
   */
  fastify.post<{ Body: unknown }>(
    '/wardrobe/generate',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = generateWardrobeSchema.safeParse(request.body ?? {})
      const body = bodyResult.success ? bodyResult.data : {}

      try {
        const result = await AestheticService.generateWardrobeGuidance(request.user!.id, body)

        return sendSuccess(reply, result, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Wardrobe guidance generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate wardrobe guidance', 500)
      }
    }
  )
}
