/**
 * Photo Engine Routes
 *
 * API endpoints for photo upload, analysis, optimization, and ranking.
 */

import type { FastifyInstance } from 'fastify'
import * as PhotoService from '@/services/photos'
import { ErrorCodes, sendError, sendSuccess } from '@/utils/response'
import {
  categoryUpdateSchema,
  enhancementOptionsSchema,
  listPhotosQuerySchema,
  personaContextSchema,
  photoIdSchema,
} from './schemas'

export async function photoRoutes(fastify: FastifyInstance) {
  // =========================================
  // Upload & CRUD
  // =========================================

  /**
   * POST /photos/upload - Upload a new photo
   */
  fastify.post('/upload', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      // Get file from multipart request
      let data
      try {
        data = await request.file()
      } catch {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid multipart request', 400)
      }

      if (!data) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'No file uploaded', 400)
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
      if (!allowedTypes.includes(data.mimetype)) {
        return sendError(
          reply,
          ErrorCodes.VALIDATION_ERROR,
          `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
          400
        )
      }

      // Read file buffer
      const buffer = await data.toBuffer()

      // Check file size (10MB max)
      const maxSize = 10 * 1024 * 1024
      if (buffer.length > maxSize) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'File size exceeds 10MB limit', 400)
      }

      // Create photo
      const photo = await PhotoService.createPhoto({
        userId: request.user!.id,
        fileData: buffer,
        mimeType: data.mimetype,
        originalFilename: data.filename,
        uploadedFrom: 'api',
      })

      return sendSuccess(reply, { photo }, 201)
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        const apiError = error as { statusCode?: number; code?: string; message: string }
        return sendError(reply, apiError.code ?? ErrorCodes.INTERNAL_ERROR, apiError.message, apiError.statusCode ?? 500)
      }
      fastify.log.error(error, 'Photo upload error')
      return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to upload photo', 500)
    }
  })

  /**
   * GET /photos - List user's photos
   */
  fastify.get<{ Querystring: Record<string, string> }>(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const queryResult = listPhotosQuerySchema.safeParse(request.query)
      const query = queryResult.success
        ? queryResult.data
        : { limit: 20, offset: 0, sortBy: 'createdAt' as const }

      const { photos, total } = await PhotoService.listByUser(request.user!.id, {
        limit: query.limit,
        offset: query.offset,
        status: query.status,
        sortBy: query.sortBy,
      })

      return sendSuccess(
        reply,
        { photos },
        200,
        {
          total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + photos.length < total,
        }
      )
    }
  )

  /**
   * GET /photos/:id - Get a specific photo
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = photoIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid photo ID', 400)
      }

      const photo = await PhotoService.getByIdForUser(request.params.id, request.user!.id)
      if (!photo) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Photo not found', 404)
      }

      return sendSuccess(reply, { photo })
    }
  )

  /**
   * DELETE /photos/:id - Delete a photo
   */
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = photoIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid photo ID', 400)
      }

      try {
        await PhotoService.deletePhoto(request.params.id, request.user!.id)
        return sendSuccess(reply, { message: 'Photo deleted successfully' })
      } catch (error) {
        if (error instanceof Error && error.name === 'ApiError') {
          const apiError = error as { statusCode?: number; code?: string; message: string }
          return sendError(reply, apiError.code ?? ErrorCodes.NOT_FOUND, apiError.message, apiError.statusCode ?? 404)
        }
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to delete photo', 500)
      }
    }
  )

  // =========================================
  // Analysis & Enhancement
  // =========================================

  /**
   * POST /photos/:id/analyze - Trigger photo analysis
   */
  fastify.post<{ Params: { id: string } }>(
    '/:id/analyze',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = photoIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid photo ID', 400)
      }

      try {
        const photo = await PhotoService.analyzePhoto(request.params.id, request.user!.id)
        return sendSuccess(reply, { photo })
      } catch (error) {
        if (error instanceof Error && error.name === 'ApiError') {
          const apiError = error as { statusCode?: number; code?: string; message: string }
          return sendError(reply, apiError.code ?? ErrorCodes.AI_SERVICE_ERROR, apiError.message, apiError.statusCode ?? 500)
        }
        fastify.log.error(error, 'Photo analysis error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to analyze photo', 500)
      }
    }
  )

  /**
   * POST /photos/:id/optimize - Apply photo enhancement
   */
  fastify.post<{ Params: { id: string }; Body: unknown }>(
    '/:id/optimize',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = photoIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid photo ID', 400)
      }

      const optionsResult = enhancementOptionsSchema.safeParse(request.body ?? {})
      const options = optionsResult.success ? optionsResult.data : {}

      try {
        const photo = await PhotoService.enhancePhoto(request.params.id, request.user!.id, options)
        return sendSuccess(reply, { photo })
      } catch (error) {
        if (error instanceof Error && error.name === 'ApiError') {
          const apiError = error as { statusCode?: number; code?: string; message: string }
          return sendError(reply, apiError.code ?? ErrorCodes.AI_SERVICE_ERROR, apiError.message, apiError.statusCode ?? 500)
        }
        fastify.log.error(error, 'Photo optimization error')
        return sendError(reply, ErrorCodes.AI_SERVICE_ERROR, 'Failed to optimize photo', 500)
      }
    }
  )

  // =========================================
  // Ranking & Organization
  // =========================================

  /**
   * GET /photos/rankings/:persona - Get ranked photos for persona
   */
  fastify.get<{ Params: { persona: string }; Querystring: { limit?: string } }>(
    '/rankings/:persona',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const contextResult = personaContextSchema.safeParse(request.params.persona)
      if (!contextResult.success) {
        return sendError(
          reply,
          ErrorCodes.VALIDATION_ERROR,
          'Invalid persona. Must be: professional, dating, social, or private',
          400
        )
      }

      const limit = Math.min(Math.max(parseInt(request.query.limit ?? '10', 10) || 10, 1), 50)

      const photos = await PhotoService.getRankedPhotos(
        request.user!.id,
        contextResult.data,
        limit
      )

      return sendSuccess(reply, {
        photos,
        persona: contextResult.data,
      })
    }
  )

  /**
   * POST /photos/:id/primary - Set as primary photo
   */
  fastify.post<{ Params: { id: string } }>(
    '/:id/primary',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = photoIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid photo ID', 400)
      }

      try {
        const photo = await PhotoService.setPrimary(request.params.id, request.user!.id)
        return sendSuccess(reply, { photo })
      } catch (error) {
        if (error instanceof Error && error.name === 'ApiError') {
          const apiError = error as { statusCode?: number; code?: string; message: string }
          return sendError(reply, apiError.code ?? ErrorCodes.NOT_FOUND, apiError.message, apiError.statusCode ?? 404)
        }
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to set primary photo', 500)
      }
    }
  )

  /**
   * PATCH /photos/:id/category - Update photo category/visibility
   */
  fastify.patch<{ Params: { id: string }; Body: unknown }>(
    '/:id/category',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = photoIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid photo ID', 400)
      }

      const updateResult = categoryUpdateSchema.safeParse(request.body)
      if (!updateResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid update data', 400)
      }

      const photo = await PhotoService.getByIdForUser(request.params.id, request.user!.id)
      if (!photo) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Photo not found', 404)
      }

      // Handle primary separately
      if (updateResult.data.isPrimary) {
        const updated = await PhotoService.setPrimary(request.params.id, request.user!.id)
        return sendSuccess(reply, { photo: updated })
      }

      // For now, just return the photo (visibility can be added later)
      return sendSuccess(reply, { photo })
    }
  )

  // =========================================
  // Batch Operations
  // =========================================

  /**
   * POST /photos/analyze-all - Analyze all pending photos
   */
  fastify.post('/analyze-all', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const result = await PhotoService.analyzeAllPending(request.user!.id)
      return sendSuccess(reply, {
        message: `Analyzed ${result.analyzed} photos, ${result.failed} failed`,
        analyzed: result.analyzed,
        failed: result.failed,
      })
    } catch (error) {
      fastify.log.error(error, 'Batch analysis error')
      return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to analyze photos', 500)
    }
  })
}
