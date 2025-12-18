/**
 * Dating Module Routes
 *
 * API endpoints for dating profile optimization and messaging assistance.
 */

import type { FastifyInstance } from 'fastify'
import * as DatingService from '@/services/modules/dating'
import { ApiError } from '@/utils/errors'
import { ErrorCodes, sendError, sendSuccess } from '@/utils/response'
import {
  analyzeConversationSchema,
  contentIdSchema,
  generateCoachingTasksSchema,
  generateDatingBioSchema,
  generateDatingPromptSchema,
  generateMessagingOpenerSchema,
  generateMessagingReplySchema,
  improveMessageSchema,
  listDatingContentQuerySchema,
} from './schemas'

export async function datingRoutes(fastify: FastifyInstance) {
  // =========================================
  // Bio & Prompt Generation
  // =========================================

  /**
   * POST /dating/bio - Generate dating bio for a platform
   */
  fastify.post<{ Body: unknown }>(
    '/bio',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = generateDatingBioSchema.safeParse(request.body)
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
        const result = await DatingService.generateDatingBio(request.user!.id, bodyResult.data)

        return sendSuccess(reply, {
          bios: result.bios,
          platform: result.platform,
          model: result.model,
          generationId: result.generationId,
        }, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Dating bio generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate dating bio', 500)
      }
    }
  )

  /**
   * POST /dating/prompt - Generate dating prompt answer
   */
  fastify.post<{ Body: unknown }>(
    '/prompt',
    { preHandler: [fastify.authenticate] },
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
        const result = await DatingService.generateDatingPrompt(request.user!.id, bodyResult.data)

        return sendSuccess(reply, {
          answers: result.answers,
          promptQuestion: result.promptQuestion,
          model: result.model,
          generationId: result.generationId,
        }, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Dating prompt generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate prompt answer', 500)
      }
    }
  )

  // =========================================
  // Messaging Assistance
  // =========================================

  /**
   * POST /dating/messaging/opener - Generate conversation starters
   */
  fastify.post<{ Body: unknown }>(
    '/messaging/opener',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = generateMessagingOpenerSchema.safeParse(request.body)
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
        const result = await DatingService.generateMessagingOpener(request.user!.id, bodyResult.data)

        return sendSuccess(reply, {
          openers: result.openers,
          model: result.model,
        }, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Messaging opener generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate openers', 500)
      }
    }
  )

  /**
   * POST /dating/messaging/reply - Generate reply suggestions
   */
  fastify.post<{ Body: unknown }>(
    '/messaging/reply',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = generateMessagingReplySchema.safeParse(request.body)
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
        const result = await DatingService.generateMessagingReply(request.user!.id, bodyResult.data)

        return sendSuccess(reply, {
          replies: result.replies,
          model: result.model,
        }, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Messaging reply generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate replies', 500)
      }
    }
  )

  /**
   * POST /dating/messaging/improve - Improve a draft message
   */
  fastify.post<{ Body: unknown }>(
    '/messaging/improve',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = improveMessageSchema.safeParse(request.body)
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
        const result = await DatingService.improveMessage(request.user!.id, bodyResult.data)

        return sendSuccess(reply, {
          improvedMessage: result.improvedMessage,
          changes: result.changes,
          analysis: result.analysis,
          alternativeVersion: result.alternativeVersion,
          model: result.model,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Message improvement error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to improve message', 500)
      }
    }
  )

  /**
   * POST /dating/messaging/analyze - Analyze a conversation
   */
  fastify.post<{ Body: unknown }>(
    '/messaging/analyze',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = analyzeConversationSchema.safeParse(request.body)
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
        const result = await DatingService.analyzeConversation(request.user!.id, bodyResult.data)

        return sendSuccess(reply, result)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Conversation analysis error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to analyze conversation', 500)
      }
    }
  )

  // =========================================
  // Photo Ranking
  // =========================================

  /**
   * GET /dating/photos/ranking - Get photo ranking for dating
   */
  fastify.get(
    '/photos/ranking',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const result = await DatingService.rankPhotosForDating(request.user!.id)

        return sendSuccess(reply, result)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Photo ranking error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to rank photos', 500)
      }
    }
  )

  // =========================================
  // Coaching
  // =========================================

  /**
   * POST /dating/coaching/tasks - Generate coaching tasks
   */
  fastify.post<{ Body: unknown }>(
    '/coaching/tasks',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = generateCoachingTasksSchema.safeParse(request.body ?? {})
      const body = bodyResult.success ? bodyResult.data : {}

      try {
        const result = await DatingService.generateCoachingTasks(request.user!.id, body)

        return sendSuccess(reply, {
          tasks: result.tasks,
          model: result.model,
        }, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Coaching tasks generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate coaching tasks', 500)
      }
    }
  )

  // =========================================
  // Content Management
  // =========================================

  /**
   * GET /dating/content - List dating content
   */
  fastify.get<{ Querystring: Record<string, string> }>(
    '/content',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const queryResult = listDatingContentQuerySchema.safeParse(request.query)
      const query = queryResult.success ? queryResult.data : { limit: 20, offset: 0 }

      const { content, total } = await DatingService.listDatingContent(request.user!.id, {
        platform: query.platform,
        limit: query.limit,
        offset: query.offset,
      })

      return sendSuccess(
        reply,
        { content },
        200,
        {
          total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + content.length < total,
        }
      )
    }
  )

  /**
   * GET /dating/content/:id - Get specific content
   */
  fastify.get<{ Params: { id: string } }>(
    '/content/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = contentIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid content ID', 400)
      }

      const content = await DatingService.getDatingContent(request.params.id, request.user!.id)
      if (!content) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Content not found', 404)
      }

      return sendSuccess(reply, { content })
    }
  )

  /**
   * DELETE /dating/content/:id - Delete content
   */
  fastify.delete<{ Params: { id: string } }>(
    '/content/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = contentIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid content ID', 400)
      }

      try {
        await DatingService.deleteDatingContent(request.params.id, request.user!.id)
        return sendSuccess(reply, { message: 'Content deleted successfully' })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to delete content', 500)
      }
    }
  )

  // =========================================
  // Voice Note Feedback
  // =========================================

  /**
   * POST /dating/voice-note/analyze - Analyze a voice note for dating
   */
  fastify.post(
    '/voice-note/analyze',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const data = await request.file()
        if (!data) {
          return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'No audio file uploaded', 400)
        }

        const buffer = await data.toBuffer()
        const mimeType = data.mimetype || 'audio/mp3'

        // Validate audio type
        const allowedTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a']
        if (!allowedTypes.includes(mimeType)) {
          return sendError(
            reply,
            ErrorCodes.VALIDATION_ERROR,
            `Invalid audio type. Allowed: ${allowedTypes.join(', ')}`,
            400
          )
        }

        const result = await DatingService.analyzeVoiceNote(buffer, mimeType)

        return sendSuccess(reply, result)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Voice note analysis error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to analyze voice note', 500)
      }
    }
  )

  // =========================================
  // Utilities
  // =========================================

  /**
   * GET /dating/platforms - Get supported platforms
   */
  fastify.get('/platforms', async (_request, reply) => {
    const platforms = DatingService.getSupportedPlatforms()
    return sendSuccess(reply, { platforms })
  })

  /**
   * GET /dating/prompts/hinge - Get Hinge prompt suggestions
   */
  fastify.get('/prompts/hinge', async (_request, reply) => {
    const prompts = DatingService.getHingePrompts()
    return sendSuccess(reply, { prompts })
  })
}
