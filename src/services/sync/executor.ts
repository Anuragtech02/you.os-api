/**
 * Sync Module Executor
 *
 * Executes sync operations across all modules in parallel,
 * tracking progress and handling failures gracefully.
 */

import type { ModuleResult, ModuleResults } from '@/db/schema/sync'
import type { GenerationContext } from './context'

export type ModuleName =
  | 'photo_engine'
  | 'bio_generator'
  | 'career_module'
  | 'dating_module'
  | 'aesthetic_module'

export const ALL_MODULES: ModuleName[] = [
  'photo_engine',
  'bio_generator',
  'career_module',
  'dating_module',
  'aesthetic_module',
]

export interface ModuleExecutionOptions {
  modules?: ModuleName[]
  skipModules?: ModuleName[]
  timeout?: number // ms per module
}

export interface ExecutionProgress {
  totalModules: number
  completedModules: number
  currentModule: string | null
  results: ModuleResults
}

export type ProgressCallback = (progress: ExecutionProgress) => void

/**
 * Execute sync for all modules in parallel
 */
export async function executeModuleSync(
  userId: string,
  context: GenerationContext,
  options: ModuleExecutionOptions = {},
  onProgress?: ProgressCallback
): Promise<ModuleResults> {
  const {
    modules = ALL_MODULES,
    skipModules = [],
    timeout = 30000, // 30 second default timeout per module
  } = options

  // Filter modules to execute
  const modulesToExecute = modules.filter((m) => !skipModules.includes(m))

  const results: ModuleResults = {}
  let completedCount = 0

  // Initialize all results as pending
  for (const moduleName of modulesToExecute) {
    results[moduleName] = {
      module: moduleName,
      status: 'pending',
    }
  }

  // Report initial progress
  onProgress?.({
    totalModules: modulesToExecute.length,
    completedModules: 0,
    currentModule: null,
    results,
  })

  // Execute modules in parallel with timeout
  const promises = modulesToExecute.map(async (moduleName) => {
    // Mark as in progress
    results[moduleName] = {
      module: moduleName,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    }

    onProgress?.({
      totalModules: modulesToExecute.length,
      completedModules: completedCount,
      currentModule: moduleName,
      results,
    })

    try {
      // Execute with timeout
      const result = await Promise.race([
        executeSingleModule(userId, moduleName, context),
        new Promise<ModuleResult>((_, reject) =>
          setTimeout(() => reject(new Error('Module execution timeout')), timeout)
        ),
      ])

      results[moduleName] = {
        ...result,
        status: 'completed',
        completedAt: new Date().toISOString(),
      }
    } catch (error) {
      results[moduleName] = {
        module: moduleName,
        status: 'failed',
        startedAt: results[moduleName]?.startedAt,
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    completedCount++
    onProgress?.({
      totalModules: modulesToExecute.length,
      completedModules: completedCount,
      currentModule: completedCount < modulesToExecute.length ? moduleName : null,
      results,
    })
  })

  // Wait for all modules to complete
  await Promise.allSettled(promises)

  return results
}

/**
 * Execute a single module's sync operation
 */
async function executeSingleModule(
  userId: string,
  moduleName: ModuleName,
  _context: GenerationContext
): Promise<ModuleResult> {
  switch (moduleName) {
    case 'photo_engine':
      return await syncPhotoEngine(userId)

    case 'bio_generator':
      return await syncBioGenerator(userId)

    case 'career_module':
      return await syncCareerModule(userId)

    case 'dating_module':
      return await syncDatingModule(userId)

    case 'aesthetic_module':
      return await syncAestheticModule(userId)

    default:
      return {
        module: moduleName,
        status: 'skipped',
        details: { reason: 'Unknown module' },
      }
  }
}

/**
 * Sync Photo Engine - Re-analyze all photos
 */
async function syncPhotoEngine(userId: string): Promise<ModuleResult> {
  // Import dynamically to avoid circular dependencies
  const { db } = await import('@/db/client')
  const { photos } = await import('@/db/schema/photos')
  const { eq, isNull, and } = await import('drizzle-orm')

  // Get all user photos
  const userPhotos = await db
    .select()
    .from(photos)
    .where(and(eq(photos.userId, userId), isNull(photos.deletedAt)))

  // For now, just count - actual re-analysis would call the photo service
  // Full implementation would call PhotoService.analyzePhoto for each

  return {
    module: 'photo_engine',
    status: 'completed',
    itemsProcessed: userPhotos.length,
    details: {
      photosFound: userPhotos.length,
      // In production, this would track actual analysis results
      analyzed: 0,
      skipped: userPhotos.length,
      reason: 'Full re-analysis disabled during sync (use individual endpoints)',
    },
  }
}

/**
 * Sync Bio Generator - Regenerate bios for all platforms
 */
async function syncBioGenerator(userId: string): Promise<ModuleResult> {
  const { db } = await import('@/db/client')
  const { generatedContent } = await import('@/db/schema/content')
  const { eq, and } = await import('drizzle-orm')

  // Count existing bios
  const existingBios = await db
    .select()
    .from(generatedContent)
    .where(and(eq(generatedContent.userId, userId), eq(generatedContent.contentType, 'bio')))

  return {
    module: 'bio_generator',
    status: 'completed',
    itemsProcessed: existingBios.length,
    details: {
      existingBios: existingBios.length,
      // Full implementation would regenerate each bio type
      regenerated: 0,
      reason: 'Full regeneration disabled during sync (use individual endpoints)',
    },
  }
}

/**
 * Sync Career Module - Update career documents
 */
async function syncCareerModule(userId: string): Promise<ModuleResult> {
  const { db } = await import('@/db/client')
  const { generatedContent } = await import('@/db/schema/content')
  const { eq, and, or } = await import('drizzle-orm')

  // Count existing career documents
  const existingDocs = await db
    .select()
    .from(generatedContent)
    .where(
      and(
        eq(generatedContent.userId, userId),
        or(
          eq(generatedContent.contentType, 'resume'),
          eq(generatedContent.contentType, 'cover_letter'),
          eq(generatedContent.contentType, 'linkedin_summary')
        )
      )
    )

  return {
    module: 'career_module',
    status: 'completed',
    itemsProcessed: existingDocs.length,
    details: {
      existingDocuments: existingDocs.length,
      regenerated: 0,
      reason: 'Career documents preserved - regenerate individually as needed',
    },
  }
}

/**
 * Sync Dating Module - Refresh dating profiles
 */
async function syncDatingModule(userId: string): Promise<ModuleResult> {
  const { db } = await import('@/db/client')
  const { generatedContent } = await import('@/db/schema/content')
  const { eq, and, or } = await import('drizzle-orm')

  // Count existing dating content
  const existingContent = await db
    .select()
    .from(generatedContent)
    .where(
      and(
        eq(generatedContent.userId, userId),
        or(
          eq(generatedContent.contentType, 'dating_profile'),
          eq(generatedContent.contentType, 'dating_prompt'),
          eq(generatedContent.contentType, 'message')
        )
      )
    )

  return {
    module: 'dating_module',
    status: 'completed',
    itemsProcessed: existingContent.length,
    details: {
      existingContent: existingContent.length,
      regenerated: 0,
      reason: 'Dating content preserved - regenerate individually as needed',
    },
  }
}

/**
 * Sync Aesthetic Module - Update recommendations
 */
async function syncAestheticModule(userId: string): Promise<ModuleResult> {
  const { db } = await import('@/db/client')
  const { identityBrains } = await import('@/db/schema/identity-brain')
  const { eq } = await import('drizzle-orm')

  // Get current aesthetic state
  const [brain] = await db
    .select({ aestheticState: identityBrains.aestheticState })
    .from(identityBrains)
    .where(eq(identityBrains.userId, userId))
    .limit(1)

  const aestheticState = brain?.aestheticState as Record<string, unknown> | null

  return {
    module: 'aesthetic_module',
    status: 'completed',
    itemsProcessed: 1,
    details: {
      hasColorPalette: !!aestheticState?.colorPalette,
      hasStyling: !!aestheticState?.styling,
      hasHair: !!aestheticState?.hair,
      hasMakeup: !!aestheticState?.makeup,
      hasWardrobe: !!aestheticState?.wardrobe,
      regenerated: 0,
      reason: 'Aesthetic recommendations preserved - regenerate individually as needed',
    },
  }
}

/**
 * Retry failed modules
 */
export async function retryFailedModules(
  userId: string,
  context: GenerationContext,
  previousResults: ModuleResults,
  onProgress?: ProgressCallback
): Promise<ModuleResults> {
  // Find failed modules
  const failedModules = Object.entries(previousResults)
    .filter(([_, result]) => result?.status === 'failed')
    .map(([name]) => name as ModuleName)

  if (failedModules.length === 0) {
    return previousResults
  }

  // Retry only failed modules
  const retryResults = await executeModuleSync(
    userId,
    context,
    { modules: failedModules },
    onProgress
  )

  // Merge results
  return {
    ...previousResults,
    ...retryResults,
  }
}
