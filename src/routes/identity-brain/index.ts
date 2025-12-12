/**
 * Identity Brain Routes
 *
 * API endpoints for managing the Identity Brain - the central engine
 * for user identity data, personas, versions, and learning.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { sendSuccess, sendError, ErrorCodes } from '@/utils/response'
import * as IdentityBrainService from '@/services/identity-brain'
import * as PersonaService from '@/services/identity-brain/personas'
import * as VersionService from '@/services/identity-brain/versions'
import * as LearningService from '@/services/identity-brain/learning'
import * as EmbeddingService from '@/services/identity-brain/embeddings'
import {
  createIdentityBrainSchema,
  updateIdentityBrainSchema,
  updateCoreAttributesSchema,
  updateAestheticStateSchema,
  createPersonaSchema,
  updatePersonaSchema,
  personaTypeSchema,
  createSnapshotSchema,
  rollbackSchema,
  processFeedbackSchema,
  paginationSchema,
} from './schemas'

export async function identityBrainRoutes(fastify: FastifyInstance) {
  // =========================================
  // Core CRUD Operations
  // =========================================

  /**
   * GET /identity-brain - Get current user's identity brain
   */
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const brain = await IdentityBrainService.getWithPersonas(request.user!.id)

      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      return sendSuccess(reply, { identityBrain: brain })
    }
  )

  /**
   * POST /identity-brain - Create identity brain
   */
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = createIdentityBrainSchema.safeParse(request.body)

      if (!parseResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      }

      try {
        const brain = await IdentityBrainService.create(request.user!.id, parseResult.data)
        return sendSuccess(reply, { identityBrain: brain }, 201)
      } catch (error) {
        if ((error as Error).name === 'ApiError') {
          throw error
        }
        fastify.log.error(error, 'Create identity brain error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to create identity brain', 500)
      }
    }
  )

  /**
   * PATCH /identity-brain - Update identity brain
   */
  fastify.patch(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      const parseResult = updateIdentityBrainSchema.safeParse(request.body)
      if (!parseResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      }

      try {
        const updated = await IdentityBrainService.update(brain.id, parseResult.data)
        return sendSuccess(reply, { identityBrain: updated })
      } catch (error) {
        if ((error as Error).name === 'ApiError') {
          throw error
        }
        fastify.log.error(error, 'Update identity brain error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to update identity brain', 500)
      }
    }
  )

  // =========================================
  // Attributes
  // =========================================

  /**
   * PATCH /identity-brain/attributes - Update core attributes
   */
  fastify.patch(
    '/attributes',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      const parseResult = updateCoreAttributesSchema.safeParse(request.body)
      if (!parseResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      }

      try {
        const updated = await IdentityBrainService.updateCoreAttributes(brain.id, parseResult.data)
        return sendSuccess(reply, { identityBrain: updated })
      } catch (error) {
        if ((error as Error).name === 'ApiError') {
          throw error
        }
        fastify.log.error(error, 'Update core attributes error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to update attributes', 500)
      }
    }
  )

  /**
   * PATCH /identity-brain/aesthetic - Update aesthetic state
   */
  fastify.patch(
    '/aesthetic',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      const parseResult = updateAestheticStateSchema.safeParse(request.body)
      if (!parseResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      }

      try {
        const updated = await IdentityBrainService.updateAestheticState(brain.id, parseResult.data)
        return sendSuccess(reply, { identityBrain: updated })
      } catch (error) {
        if ((error as Error).name === 'ApiError') {
          throw error
        }
        fastify.log.error(error, 'Update aesthetic state error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to update aesthetic', 500)
      }
    }
  )

  // =========================================
  // Personas
  // =========================================

  /**
   * GET /identity-brain/personas - List all personas
   */
  fastify.get(
    '/personas',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      const personas = await PersonaService.getByIdentityBrainId(brain.id)
      return sendSuccess(reply, { personas })
    }
  )

  /**
   * POST /identity-brain/personas - Create persona
   */
  fastify.post(
    '/personas',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      const parseResult = createPersonaSchema.safeParse(request.body)
      if (!parseResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      }

      try {
        const persona = await PersonaService.create(brain.id, parseResult.data)
        return sendSuccess(reply, { persona }, 201)
      } catch (error) {
        if ((error as Error).name === 'ApiError') {
          throw error
        }
        fastify.log.error(error, 'Create persona error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to create persona', 500)
      }
    }
  )

  /**
   * PATCH /identity-brain/personas/:type - Update persona
   */
  fastify.patch<{ Params: { type: string } }>(
    '/personas/:type',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      const typeResult = personaTypeSchema.safeParse(request.params.type)
      if (!typeResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid persona type', 400)
      }

      const parseResult = updatePersonaSchema.safeParse(request.body)
      if (!parseResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      }

      try {
        const persona = await PersonaService.update(brain.id, typeResult.data, parseResult.data)
        return sendSuccess(reply, { persona })
      } catch (error) {
        if ((error as Error).name === 'ApiError') {
          throw error
        }
        fastify.log.error(error, 'Update persona error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to update persona', 500)
      }
    }
  )

  /**
   * DELETE /identity-brain/personas/:type - Delete persona
   */
  fastify.delete<{ Params: { type: string } }>(
    '/personas/:type',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      const typeResult = personaTypeSchema.safeParse(request.params.type)
      if (!typeResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid persona type', 400)
      }

      try {
        await PersonaService.remove(brain.id, typeResult.data)
        return sendSuccess(reply, { message: 'Persona deleted' })
      } catch (error) {
        if ((error as Error).name === 'ApiError') {
          throw error
        }
        fastify.log.error(error, 'Delete persona error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to delete persona', 500)
      }
    }
  )

  /**
   * POST /identity-brain/personas/:type/activate - Set persona as active
   */
  fastify.post<{ Params: { type: string } }>(
    '/personas/:type/activate',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      const typeResult = personaTypeSchema.safeParse(request.params.type)
      if (!typeResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid persona type', 400)
      }

      try {
        const persona = await PersonaService.activate(brain.id, typeResult.data)
        return sendSuccess(reply, { persona })
      } catch (error) {
        if ((error as Error).name === 'ApiError') {
          throw error
        }
        fastify.log.error(error, 'Activate persona error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to activate persona', 500)
      }
    }
  )

  // =========================================
  // Versions
  // =========================================

  /**
   * GET /identity-brain/versions - List versions
   */
  fastify.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/versions',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      const paginationResult = paginationSchema.safeParse(request.query)
      const pagination = paginationResult.success ? paginationResult.data : { limit: 20, offset: 0 }

      const versions = await VersionService.list(brain.id, pagination)
      const counts = await VersionService.getVersionCount(brain.id)

      return sendSuccess(reply, {
        versions,
        pagination: {
          ...pagination,
          total: counts.total,
        },
        counts,
      })
    }
  )

  /**
   * GET /identity-brain/versions/:version - Get specific version
   */
  fastify.get<{ Params: { version: string } }>(
    '/versions/:version',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      const versionNumber = parseInt(request.params.version, 10)
      if (isNaN(versionNumber)) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid version number', 400)
      }

      const version = await VersionService.getByVersionNumber(brain.id, versionNumber)
      if (!version) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Version not found', 404)
      }

      return sendSuccess(reply, { version })
    }
  )

  /**
   * POST /identity-brain/versions/rollback - Rollback to version
   */
  fastify.post(
    '/versions/rollback',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      const parseResult = rollbackSchema.safeParse(request.body)
      if (!parseResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      }

      try {
        const updated = await VersionService.rollback(brain.id, parseResult.data.versionNumber)
        return sendSuccess(reply, { identityBrain: updated })
      } catch (error) {
        if ((error as Error).name === 'ApiError') {
          throw error
        }
        fastify.log.error(error, 'Rollback error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to rollback', 500)
      }
    }
  )

  /**
   * POST /identity-brain/versions/snapshot - Create manual snapshot
   */
  fastify.post(
    '/versions/snapshot',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      const parseResult = createSnapshotSchema.safeParse(request.body)
      if (!parseResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      }

      try {
        const version = await VersionService.createSnapshot(brain.id, parseResult.data.name)
        return sendSuccess(reply, { version }, 201)
      } catch (error) {
        if ((error as Error).name === 'ApiError') {
          throw error
        }
        fastify.log.error(error, 'Create snapshot error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to create snapshot', 500)
      }
    }
  )

  // =========================================
  // Embeddings
  // =========================================

  /**
   * POST /identity-brain/embeddings/generate - Regenerate embeddings
   */
  fastify.post(
    '/embeddings/generate',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      try {
        await EmbeddingService.regenerateEmbeddings(brain.id)
        const status = await EmbeddingService.getEmbeddingStatus(brain.id)
        return sendSuccess(reply, { status, message: 'Embeddings regenerated successfully' })
      } catch (error) {
        if ((error as Error).name === 'ApiError') {
          throw error
        }
        fastify.log.error(error, 'Regenerate embeddings error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to regenerate embeddings', 500)
      }
    }
  )

  /**
   * GET /identity-brain/embeddings/status - Get embedding status
   */
  fastify.get(
    '/embeddings/status',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      try {
        const status = await EmbeddingService.getEmbeddingStatus(brain.id)
        return sendSuccess(reply, { status })
      } catch (error) {
        if ((error as Error).name === 'ApiError') {
          throw error
        }
        fastify.log.error(error, 'Get embedding status error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to get embedding status', 500)
      }
    }
  )

  // =========================================
  // Learning
  // =========================================

  /**
   * POST /identity-brain/feedback - Process feedback
   */
  fastify.post(
    '/feedback',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      const parseResult = processFeedbackSchema.safeParse(request.body)
      if (!parseResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
          errors: parseResult.error.flatten().fieldErrors,
        })
      }

      try {
        await LearningService.processFeedback(brain.id, parseResult.data)
        return sendSuccess(reply, { message: 'Feedback processed' })
      } catch (error) {
        if ((error as Error).name === 'ApiError') {
          throw error
        }
        fastify.log.error(error, 'Process feedback error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to process feedback', 500)
      }
    }
  )

  /**
   * GET /identity-brain/insights - Get learning insights
   */
  fastify.get(
    '/insights',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      try {
        const insights = await LearningService.getLearningInsights(brain.id)
        return sendSuccess(reply, { insights })
      } catch (error) {
        if ((error as Error).name === 'ApiError') {
          throw error
        }
        fastify.log.error(error, 'Get insights error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to get insights', 500)
      }
    }
  )

  /**
   * DELETE /identity-brain/learning - Clear learning history
   */
  fastify.delete(
    '/learning',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const brain = await IdentityBrainService.getByUserId(request.user!.id)
      if (!brain) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Identity brain not found', 404)
      }

      try {
        await LearningService.clearLearningHistory(brain.id)
        return sendSuccess(reply, { message: 'Learning history cleared' })
      } catch (error) {
        if ((error as Error).name === 'ApiError') {
          throw error
        }
        fastify.log.error(error, 'Clear learning history error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to clear learning history', 500)
      }
    }
  )
}
