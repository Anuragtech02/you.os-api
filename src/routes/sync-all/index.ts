/**
 * Sync-All Routes
 *
 * API endpoints for triggering and monitoring sync operations.
 */

import type { FastifyInstance } from 'fastify'
import * as SyncService from '@/services/sync'
import { ApiError } from '@/utils/errors'
import { ErrorCodes, sendError, sendSuccess } from '@/utils/response'
import { triggerSyncSchema, listJobsQuerySchema, jobIdSchema } from './schemas'

export async function syncAllRoutes(fastify: FastifyInstance) {
  // =========================================
  // Trigger Sync
  // =========================================

  /**
   * POST /sync-all - Trigger a full sync
   */
  fastify.post<{ Body: unknown }>(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = triggerSyncSchema.safeParse(request.body ?? {})
      const body = bodyResult.success ? bodyResult.data : { force: false, skipModules: [] }

      try {
        const result = await SyncService.triggerSyncAll(request.user!.id, {
          force: body.force,
          triggeredBy: 'manual',
          skipModules: body.skipModules,
        })

        return sendSuccess(
          reply,
          {
            jobId: result.job.id,
            status: result.job.status,
            duration: result.duration,
            results: result.results,
          },
          201
        )
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Sync trigger error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to trigger sync', 500)
      }
    }
  )

  // =========================================
  // Sync Status
  // =========================================

  /**
   * GET /sync-all/status - Get current sync status
   */
  fastify.get(
    '/status',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const status = await SyncService.getSyncStatus(request.user!.id)

        return sendSuccess(reply, {
          isRunning: status.isRunning,
          canSync: status.canSync,
          cooldownRemaining: Math.ceil(status.cooldownRemaining / 1000), // Convert to seconds
          currentJob: status.currentJob
            ? {
                id: status.currentJob.id,
                status: status.currentJob.status,
                progress: {
                  total: status.currentJob.totalModules,
                  completed: status.currentJob.completedModules,
                  current: status.currentJob.currentModule,
                },
                startedAt: status.currentJob.startedAt,
              }
            : null,
          lastSync: status.lastSync
            ? {
                id: status.lastSync.id,
                status: status.lastSync.status,
                completedAt: status.lastSync.completedAt,
                duration: status.lastSync.startedAt && status.lastSync.completedAt
                  ? new Date(status.lastSync.completedAt).getTime() -
                    new Date(status.lastSync.startedAt).getTime()
                  : null,
              }
            : null,
        })
      } catch (error) {
        fastify.log.error(error, 'Get sync status error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to get sync status', 500)
      }
    }
  )

  // =========================================
  // Job Management
  // =========================================

  /**
   * GET /sync-all/jobs - List sync jobs
   */
  fastify.get<{ Querystring: Record<string, string> }>(
    '/jobs',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const queryResult = listJobsQuerySchema.safeParse(request.query)
      const query = queryResult.success ? queryResult.data : { limit: 20, offset: 0 }

      try {
        const { jobs, total } = await SyncService.listSyncJobs(request.user!.id, {
          limit: query.limit,
          offset: query.offset,
        })

        return sendSuccess(
          reply,
          {
            jobs: jobs.map((job) => ({
              id: job.id,
              status: job.status,
              triggeredBy: job.triggeredBy,
              totalModules: job.totalModules,
              completedModules: job.completedModules,
              startedAt: job.startedAt,
              completedAt: job.completedAt,
              error: job.error,
            })),
          },
          200,
          {
            total,
            limit: query.limit,
            offset: query.offset,
            hasMore: query.offset + jobs.length < total,
          }
        )
      } catch (error) {
        fastify.log.error(error, 'List sync jobs error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to list sync jobs', 500)
      }
    }
  )

  /**
   * GET /sync-all/jobs/:id - Get job details
   */
  fastify.get<{ Params: { id: string } }>(
    '/jobs/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = jobIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid job ID', 400)
      }

      try {
        const job = await SyncService.getSyncJob(idResult.data, request.user!.id)

        if (!job) {
          return sendError(reply, ErrorCodes.NOT_FOUND, 'Sync job not found', 404)
        }

        return sendSuccess(reply, {
          id: job.id,
          status: job.status,
          triggeredBy: job.triggeredBy,
          progress: {
            total: job.totalModules,
            completed: job.completedModules,
            current: job.currentModule,
          },
          moduleResults: job.moduleResults,
          error: job.error,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          duration:
            job.startedAt && job.completedAt
              ? new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()
              : null,
        })
      } catch (error) {
        fastify.log.error(error, 'Get sync job error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to get sync job', 500)
      }
    }
  )

  /**
   * GET /sync-all/jobs/:id/progress - SSE stream for job progress
   */
  fastify.get<{ Params: { id: string } }>(
    '/jobs/:id/progress',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = jobIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid job ID', 400)
      }

      const job = await SyncService.getSyncJob(idResult.data, request.user!.id)
      if (!job) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Sync job not found', 404)
      }

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      })

      // Send initial state
      const sendEvent = (event: string, data: unknown) => {
        reply.raw.write(`event: ${event}\n`)
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
      }

      sendEvent('progress', {
        jobId: job.id,
        status: job.status,
        totalModules: job.totalModules,
        completedModules: job.completedModules,
        currentModule: job.currentModule,
        results: job.moduleResults,
      })

      // If job is already complete, close connection
      if (job.status === 'completed' || job.status === 'failed') {
        sendEvent('complete', {
          jobId: job.id,
          status: job.status,
          results: job.moduleResults,
          error: job.error,
        })
        reply.raw.end()
        return
      }

      // Poll for updates (in production, use pub/sub)
      const pollInterval = setInterval(async () => {
        try {
          const updatedJob = await SyncService.getSyncJob(idResult.data, request.user!.id)

          if (!updatedJob) {
            clearInterval(pollInterval)
            reply.raw.end()
            return
          }

          sendEvent('progress', {
            jobId: updatedJob.id,
            status: updatedJob.status,
            totalModules: updatedJob.totalModules,
            completedModules: updatedJob.completedModules,
            currentModule: updatedJob.currentModule,
            results: updatedJob.moduleResults,
          })

          if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
            sendEvent('complete', {
              jobId: updatedJob.id,
              status: updatedJob.status,
              results: updatedJob.moduleResults,
              error: updatedJob.error,
            })
            clearInterval(pollInterval)
            reply.raw.end()
          }
        } catch (error) {
          fastify.log.error(error, 'SSE poll error')
          clearInterval(pollInterval)
          reply.raw.end()
        }
      }, 1000) // Poll every second

      // Handle client disconnect
      request.raw.on('close', () => {
        clearInterval(pollInterval)
      })
    }
  )

  /**
   * POST /sync-all/jobs/:id/retry - Retry failed modules
   */
  fastify.post<{ Params: { id: string } }>(
    '/jobs/:id/retry',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = jobIdSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid job ID', 400)
      }

      try {
        const result = await SyncService.retrySyncJob(idResult.data, request.user!.id)

        return sendSuccess(reply, {
          jobId: result.job.id,
          status: result.job.status,
          duration: result.duration,
          results: result.results,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Retry sync job error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to retry sync job', 500)
      }
    }
  )
}
