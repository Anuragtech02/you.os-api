/**
 * Career Module Routes
 *
 * API endpoints for generating and managing career documents.
 */

import type { FastifyInstance } from 'fastify'
import * as CareerService from '@/services/modules/career'
import { ApiError } from '@/utils/errors'
import { ErrorCodes, sendError, sendSuccess } from '@/utils/response'
import {
  documentIdSchema,
  generateCoverLetterSchema,
  generateElevatorPitchSchema,
  generateLinkedInHeadlineSchema,
  generateLinkedInSummarySchema,
  generateResumeBulletsSchema,
  generateResumeSummarySchema,
  listDocumentsQuerySchema,
  updateDocumentSchema,
} from './schemas'

export async function careerRoutes(fastify: FastifyInstance) {
  // =========================================
  // Resume Generation
  // =========================================

  /**
   * POST /career/resume/summary - Generate resume summary
   */
  fastify.post<{ Body: unknown }>(
    '/resume/summary',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = generateResumeSummarySchema.safeParse(request.body)
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
        const result = await CareerService.generateResumeSummary(request.user!.id, bodyResult.data)

        return sendSuccess(reply, {
          summaries: result.summaries,
          model: result.model,
          generationId: result.generationId,
        }, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Resume summary generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate resume summary', 500)
      }
    }
  )

  /**
   * POST /career/resume/bullets - Generate resume bullet points
   */
  fastify.post<{ Body: unknown }>(
    '/resume/bullets',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = generateResumeBulletsSchema.safeParse(request.body)
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
        const result = await CareerService.generateResumeBullets(request.user!.id, bodyResult.data)

        return sendSuccess(reply, {
          bullets: result.bullets,
          model: result.model,
          generationId: result.generationId,
        }, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Resume bullets generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate resume bullets', 500)
      }
    }
  )

  // =========================================
  // Cover Letter Generation
  // =========================================

  /**
   * POST /career/cover-letter - Generate cover letter
   */
  fastify.post<{ Body: unknown }>(
    '/cover-letter',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = generateCoverLetterSchema.safeParse(request.body)
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
        const result = await CareerService.generateCoverLetter(request.user!.id, bodyResult.data)

        return sendSuccess(reply, {
          coverLetter: result.coverLetter,
          keyPoints: result.keyPoints,
          wordCount: result.wordCount,
          model: result.model,
          generationId: result.generationId,
        }, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Cover letter generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate cover letter', 500)
      }
    }
  )

  // =========================================
  // LinkedIn Generation
  // =========================================

  /**
   * POST /career/linkedin/headline - Generate LinkedIn headlines
   */
  fastify.post<{ Body: unknown }>(
    '/linkedin/headline',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = generateLinkedInHeadlineSchema.safeParse(request.body)
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
        const result = await CareerService.generateLinkedInHeadline(request.user!.id, bodyResult.data)

        return sendSuccess(reply, {
          headlines: result.headlines,
          model: result.model,
          generationId: result.generationId,
        }, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'LinkedIn headline generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate LinkedIn headlines', 500)
      }
    }
  )

  /**
   * POST /career/linkedin/summary - Generate LinkedIn summary
   */
  fastify.post<{ Body: unknown }>(
    '/linkedin/summary',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = generateLinkedInSummarySchema.safeParse(request.body)
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
        const result = await CareerService.generateLinkedInSummary(request.user!.id, bodyResult.data)

        return sendSuccess(reply, {
          summaries: result.summaries,
          model: result.model,
          generationId: result.generationId,
        }, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'LinkedIn summary generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate LinkedIn summary', 500)
      }
    }
  )

  // =========================================
  // Elevator Pitch Generation
  // =========================================

  /**
   * POST /career/elevator-pitch - Generate elevator pitch
   */
  fastify.post<{ Body: unknown }>(
    '/elevator-pitch',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = generateElevatorPitchSchema.safeParse(request.body)
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
        const result = await CareerService.generateElevatorPitch(request.user!.id, bodyResult.data)

        return sendSuccess(reply, {
          pitches: result.pitches,
          model: result.model,
          generationId: result.generationId,
        }, 201)
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Elevator pitch generation error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to generate elevator pitch', 500)
      }
    }
  )

  // =========================================
  // Document Management
  // =========================================

  /**
   * GET /career/documents - List career documents
   */
  fastify.get<{ Querystring: Record<string, string> }>(
    '/documents',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const queryResult = listDocumentsQuerySchema.safeParse(request.query)
      const query = queryResult.success ? queryResult.data : { limit: 20, offset: 0 }

      const { documents, total } = await CareerService.listCareerDocuments(request.user!.id, {
        documentType: query.documentType,
        limit: query.limit,
        offset: query.offset,
      })

      return sendSuccess(
        reply,
        { documents },
        200,
        {
          total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + documents.length < total,
        }
      )
    }
  )

  /**
   * GET /career/documents/:id - Get a specific document
   */
  fastify.get<{ Params: { id: string } }>(
    '/documents/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = documentIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid document ID', 400)
      }

      const document = await CareerService.getCareerDocument(request.params.id, request.user!.id)
      if (!document) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Document not found', 404)
      }

      return sendSuccess(reply, { document })
    }
  )

  /**
   * PATCH /career/documents/:id - Update a document
   */
  fastify.patch<{ Params: { id: string }; Body: unknown }>(
    '/documents/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = documentIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid document ID', 400)
      }

      const bodyResult = updateDocumentSchema.safeParse(request.body)
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
        const document = await CareerService.updateCareerDocument(
          request.params.id,
          request.user!.id,
          bodyResult.data
        )

        return sendSuccess(reply, { document })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to update document', 500)
      }
    }
  )

  /**
   * DELETE /career/documents/:id - Delete a document
   */
  fastify.delete<{ Params: { id: string } }>(
    '/documents/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = documentIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid document ID', 400)
      }

      try {
        await CareerService.deleteCareerDocument(request.params.id, request.user!.id)
        return sendSuccess(reply, { message: 'Document deleted successfully' })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to delete document', 500)
      }
    }
  )

  // =========================================
  // Utilities
  // =========================================

  /**
   * GET /career/document-types - Get document type specifications
   */
  fastify.get('/document-types', async (_request, reply) => {
    const specs = CareerService.getDocumentSpecs()
    return sendSuccess(reply, { documentTypes: specs })
  })
}
