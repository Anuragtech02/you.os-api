/**
 * Sync-All Orchestrator
 *
 * Main orchestration service that coordinates the full sync process:
 * 1. Pre-sync validation (lock, cooldown)
 * 2. Context building
 * 3. Parallel module execution
 * 4. Post-sync updates
 */

import { db } from '@/db/client'
import { identityBrains } from '@/db/schema/identity-brain'
import { syncJobs, type SyncJob, type ModuleResults } from '@/db/schema/sync'
import { eq, and, gte, desc } from 'drizzle-orm'
import { buildGenerationContext, type GenerationContext } from './context'
import { executeModuleSync, retryFailedModules, ALL_MODULES, type ProgressCallback } from './executor'
import { createSyncEvent } from './events'
import { ApiError } from '@/utils/errors'

// Constants
const SYNC_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes
const SYNC_LOCK_TIMEOUT_MS = 60 * 1000 // 60 seconds

export interface SyncOptions {
  force?: boolean // Bypass cooldown
  triggeredBy?: 'manual' | 'auto' | 'feedback'
  skipModules?: string[]
}

export interface SyncResult {
  job: SyncJob
  results: ModuleResults
  duration: number
}

/**
 * Trigger a full sync-all operation
 */
export async function triggerSyncAll(
  userId: string,
  options: SyncOptions = {},
  onProgress?: ProgressCallback
): Promise<SyncResult> {
  const startTime = Date.now()
  const { force = false, triggeredBy = 'manual', skipModules = [] } = options

  // Pre-sync validation
  await validateSyncPrerequisites(userId, force)

  // Acquire lock
  await acquireSyncLock(userId)

  let job: SyncJob | null = null

  try {
    // Create sync job
    job = await createSyncJob(userId, triggeredBy)

    // Build generation context
    const context = await buildGenerationContext(userId)
    if (!context) {
      throw new ApiError('NOT_FOUND', 'Identity brain not found', 404)
    }

    // Create sync event
    await createSyncEvent(userId, 'sync_all_triggered', {
      jobId: job.id,
      triggeredBy,
    })

    // Execute all modules in parallel
    const results = await executeModuleSync(
      userId,
      context,
      {
        modules: ALL_MODULES,
        skipModules: skipModules as any,
      },
      (progress) => {
        // Update job progress in DB
        updateJobProgress(job!.id, progress.completedModules, progress.currentModule, progress.results)
        // Call external progress handler
        onProgress?.(progress)
      }
    )

    // Post-sync updates
    await performPostSyncUpdates(userId, context, results)

    // Complete the job
    const completedJob = await completeJob(job.id, results)

    return {
      job: completedJob,
      results,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    // Mark job as failed if it was created
    if (job) {
      await failJob(job.id, error instanceof Error ? error.message : 'Unknown error')
    }
    throw error
  } finally {
    // Always release lock
    await releaseSyncLock(userId)
  }
}

/**
 * Validate pre-sync requirements
 */
async function validateSyncPrerequisites(userId: string, force: boolean): Promise<void> {
  // Check for existing sync in progress
  const inProgressSync = await db
    .select()
    .from(syncJobs)
    .where(and(eq(syncJobs.userId, userId), eq(syncJobs.status, 'in_progress')))
    .limit(1)

  if (inProgressSync.length > 0 && inProgressSync[0]) {
    const job = inProgressSync[0]
    const elapsed = job.startedAt ? Date.now() - new Date(job.startedAt).getTime() : 0

    // Check if it's a stale lock (over timeout)
    if (elapsed > SYNC_LOCK_TIMEOUT_MS) {
      // Auto-fail the stale job
      await failJob(job.id, 'Sync timed out')
    } else {
      throw new ApiError('CONFLICT', 'Sync already in progress', 409)
    }
  }

  // Check cooldown (unless forced)
  if (!force) {
    const recentSync = await db
      .select()
      .from(syncJobs)
      .where(
        and(
          eq(syncJobs.userId, userId),
          eq(syncJobs.status, 'completed'),
          gte(syncJobs.completedAt, new Date(Date.now() - SYNC_COOLDOWN_MS))
        )
      )
      .limit(1)

    if (recentSync.length > 0 && recentSync[0]?.completedAt) {
      const lastSync = recentSync[0]
      const cooldownRemaining = SYNC_COOLDOWN_MS - (Date.now() - new Date(lastSync.completedAt!).getTime())
      throw new ApiError(
        'RATE_LIMITED',
        `Please wait ${Math.ceil(cooldownRemaining / 1000)} seconds before syncing again`,
        429
      )
    }
  }

  // Verify identity brain exists
  const [brain] = await db
    .select({ id: identityBrains.id })
    .from(identityBrains)
    .where(eq(identityBrains.userId, userId))
    .limit(1)

  if (!brain) {
    throw new ApiError('NOT_FOUND', 'Identity brain not found. Please set up your profile first.', 404)
  }
}

/**
 * Acquire sync lock
 */
async function acquireSyncLock(userId: string): Promise<void> {
  await db
    .update(identityBrains)
    .set({ syncStatus: 'in_progress' })
    .where(eq(identityBrains.userId, userId))
}

/**
 * Release sync lock
 */
async function releaseSyncLock(userId: string): Promise<void> {
  await db
    .update(identityBrains)
    .set({
      syncStatus: 'idle',
      lastSyncedAt: new Date(),
    })
    .where(eq(identityBrains.userId, userId))
}

/**
 * Create a new sync job
 */
async function createSyncJob(userId: string, triggeredBy: string): Promise<SyncJob> {
  const [job] = await db
    .insert(syncJobs)
    .values({
      userId,
      triggeredBy,
      status: 'in_progress',
      totalModules: ALL_MODULES.length,
      completedModules: 0,
      startedAt: new Date(),
    })
    .returning()

  return job!
}

/**
 * Update job progress
 */
async function updateJobProgress(
  jobId: string,
  completedModules: number,
  currentModule: string | null,
  moduleResults: ModuleResults
): Promise<void> {
  await db
    .update(syncJobs)
    .set({
      completedModules,
      currentModule,
      moduleResults,
    })
    .where(eq(syncJobs.id, jobId))
}

/**
 * Complete a sync job
 */
async function completeJob(jobId: string, results: ModuleResults): Promise<SyncJob> {
  const [job] = await db
    .update(syncJobs)
    .set({
      status: 'completed',
      completedAt: new Date(),
      moduleResults: results,
      currentModule: null,
    })
    .where(eq(syncJobs.id, jobId))
    .returning()

  return job!
}

/**
 * Mark job as failed
 */
async function failJob(jobId: string, error: string): Promise<void> {
  await db
    .update(syncJobs)
    .set({
      status: 'failed',
      completedAt: new Date(),
      error,
      currentModule: null,
    })
    .where(eq(syncJobs.id, jobId))
}

/**
 * Perform post-sync updates
 */
async function performPostSyncUpdates(
  _userId: string,
  _context: GenerationContext,
  _results: ModuleResults
): Promise<void> {
  // Update last synced timestamp (done in releaseSyncLock)
  // Additional post-sync operations could be added here:
  // - Update content embeddings
  // - Refresh learning state
  // - Create version snapshot
}

/**
 * Get current sync status for a user
 */
export async function getSyncStatus(userId: string): Promise<{
  isRunning: boolean
  currentJob: SyncJob | null
  lastSync: SyncJob | null
  canSync: boolean
  cooldownRemaining: number
}> {
  // Get current running job
  const [currentJob] = await db
    .select()
    .from(syncJobs)
    .where(and(eq(syncJobs.userId, userId), eq(syncJobs.status, 'in_progress')))
    .limit(1)

  // Get last completed sync
  const [lastSync] = await db
    .select()
    .from(syncJobs)
    .where(and(eq(syncJobs.userId, userId), eq(syncJobs.status, 'completed')))
    .orderBy(desc(syncJobs.completedAt))
    .limit(1)

  // Calculate cooldown
  let cooldownRemaining = 0
  let canSync = true

  if (currentJob) {
    canSync = false
  } else if (lastSync?.completedAt) {
    const elapsed = Date.now() - new Date(lastSync.completedAt).getTime()
    if (elapsed < SYNC_COOLDOWN_MS) {
      cooldownRemaining = SYNC_COOLDOWN_MS - elapsed
      canSync = false
    }
  }

  return {
    isRunning: !!currentJob,
    currentJob: currentJob || null,
    lastSync: lastSync || null,
    canSync,
    cooldownRemaining,
  }
}

/**
 * Get sync job by ID
 */
export async function getSyncJob(jobId: string, userId: string): Promise<SyncJob | null> {
  const [job] = await db
    .select()
    .from(syncJobs)
    .where(and(eq(syncJobs.id, jobId), eq(syncJobs.userId, userId)))
    .limit(1)

  return job || null
}

/**
 * List sync jobs for a user
 */
export async function listSyncJobs(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ jobs: SyncJob[]; total: number }> {
  const { limit = 20, offset = 0 } = options

  const jobs = await db
    .select()
    .from(syncJobs)
    .where(eq(syncJobs.userId, userId))
    .orderBy(desc(syncJobs.createdAt))
    .limit(limit)
    .offset(offset)

  const [countResult] = await db
    .select({ count: syncJobs.id })
    .from(syncJobs)
    .where(eq(syncJobs.userId, userId))

  return {
    jobs,
    total: countResult ? 1 : 0, // Simplified count
  }
}

/**
 * Retry failed modules in a job
 */
export async function retrySyncJob(
  jobId: string,
  userId: string,
  onProgress?: ProgressCallback
): Promise<SyncResult> {
  const startTime = Date.now()

  // Get the job
  const job = await getSyncJob(jobId, userId)
  if (!job) {
    throw new ApiError('NOT_FOUND', 'Sync job not found', 404)
  }

  if (job.status !== 'failed' && job.status !== 'completed') {
    throw new ApiError('VALIDATION_ERROR', 'Can only retry failed or completed jobs', 400)
  }

  // Check if any modules failed
  const results = job.moduleResults as ModuleResults
  const hasFailures = Object.values(results).some((r) => r?.status === 'failed')

  if (!hasFailures) {
    throw new ApiError('VALIDATION_ERROR', 'No failed modules to retry', 400)
  }

  // Build context
  const context = await buildGenerationContext(userId)
  if (!context) {
    throw new ApiError('NOT_FOUND', 'Identity brain not found', 404)
  }

  // Retry failed modules
  const newResults = await retryFailedModules(userId, context, results, onProgress)

  // Update job with new results
  const [updatedJob] = await db
    .update(syncJobs)
    .set({
      moduleResults: newResults,
      status: Object.values(newResults).some((r) => r?.status === 'failed') ? 'failed' : 'completed',
    })
    .where(eq(syncJobs.id, jobId))
    .returning()

  return {
    job: updatedJob!,
    results: newResults,
    duration: Date.now() - startTime,
  }
}
