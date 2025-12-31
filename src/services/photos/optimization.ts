/**
 * Photo Optimization Service
 *
 * Identity-preserving photo optimization system.
 * Generates exactly 3 optimized variants per photo:
 * 1. Professional - LinkedIn, resumes, corporate (clean, credible, restrained)
 * 2. Attractive - Social media, personal branding (polished, confident, natural)
 * 3. Neutral - Minimal enhancement (preserves identity as closely as possible)
 *
 * Key principles:
 * - No unlimited variations
 * - No heavy face distortion
 * - No slider-style tweaking
 * - Identity consistency is critical
 */

import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  type NewPhotoOptimization,
  type OptimizationDetails,
  type OptimizationPreset,
  type Photo,
  type PhotoMetadata,
  type PhotoOptimization,
  photoOptimizations,
  photos,
} from '@/db/schema'
import { Errors } from '@/utils/errors'
import * as GeminiService from '../ai/gemini'
import * as StorageService from './storage'

/**
 * Optimization preset configurations
 * Each preset defines the level of enhancement applied
 */
const PRESET_CONFIGS: Record<
  OptimizationPreset,
  {
    name: string
    description: string
    adjustments: OptimizationDetails['adjustments']
    promptGuidance: string
  }
> = {
  professional: {
    name: 'Professional / Authority',
    description: 'For LinkedIn, resumes, corporate profiles - clean, credible, restrained',
    adjustments: {
      lighting: 'moderate',
      colorCorrection: 'subtle',
      skinRetouching: 'subtle',
      backgroundCleanup: 'moderate',
    },
    promptGuidance: `Create a professional, authoritative look suitable for LinkedIn and corporate profiles.
- Clean, even lighting that conveys competence
- Subtle color correction for natural skin tones
- Minimal skin retouching - keep natural texture, remove only distracting blemishes
- Clean, non-distracting background
- Maintain serious/confident expression
- NO heavy filters or stylization
- CRITICAL: Preserve the person's identity - they must be immediately recognizable`,
  },
  attractive: {
    name: 'Attractive / Social',
    description: 'For social media and personal branding - polished, confident, natural',
    adjustments: {
      lighting: 'moderate',
      colorCorrection: 'moderate',
      skinRetouching: 'moderate',
      backgroundCleanup: 'subtle',
    },
    promptGuidance: `Create an attractive, approachable look for social media and personal branding.
- Warm, flattering lighting that enhances features
- Vibrant but natural colors
- Moderate skin smoothing - remove imperfections but keep natural texture and pores
- Enhance eyes slightly for more engagement
- Keep background context if relevant
- NO heavy filters, artificial bokeh, or dramatic effects
- CRITICAL: Preserve the person's identity - they must be immediately recognizable`,
  },
  neutral: {
    name: 'Neutral / Natural',
    description: 'Minimal enhancement - preserves identity as closely as possible',
    adjustments: {
      lighting: 'subtle',
      colorCorrection: 'subtle',
      skinRetouching: 'none',
      backgroundCleanup: 'none',
    },
    promptGuidance: `Apply minimal enhancement while preserving the original photo as much as possible.
- Only subtle lighting adjustments if needed for visibility
- Minimal color correction - just white balance if off
- NO skin retouching
- NO background changes
- Preserve all natural features, texture, and imperfections
- This should look almost identical to the original
- CRITICAL: Maximum identity preservation - the output should be the truest representation`,
  },
}

/**
 * Get all optimizations for a photo
 */
export async function getOptimizations(photoId: string): Promise<PhotoOptimization[]> {
  return db
    .select()
    .from(photoOptimizations)
    .where(eq(photoOptimizations.photoId, photoId))
}

/**
 * Get a specific optimization by preset
 */
export async function getOptimizationByPreset(
  photoId: string,
  preset: OptimizationPreset
): Promise<PhotoOptimization | null> {
  const [optimization] = await db
    .select()
    .from(photoOptimizations)
    .where(and(eq(photoOptimizations.photoId, photoId), eq(photoOptimizations.preset, preset)))
    .limit(1)

  return optimization ?? null
}

/**
 * Check if a photo has been fully optimized (all 3 variants)
 */
export async function isFullyOptimized(photoId: string): Promise<boolean> {
  const optimizations = await getOptimizations(photoId)
  return optimizations.length === 3
}

/**
 * Optimize a photo with a specific preset
 */
export async function optimizeWithPreset(
  photoId: string,
  userId: string,
  preset: OptimizationPreset
): Promise<PhotoOptimization> {
  // Verify photo exists and belongs to user
  const [photo] = await db
    .select()
    .from(photos)
    .where(and(eq(photos.id, photoId), eq(photos.userId, userId)))
    .limit(1)

  if (!photo) {
    throw Errors.notFound('Photo')
  }

  // Check if this preset already exists
  const existing = await getOptimizationByPreset(photoId, preset)
  if (existing) {
    throw Errors.alreadyExists(`${preset} optimization`)
  }

  const config = PRESET_CONFIGS[preset]
  const startTime = Date.now()

  try {
    // Download original photo
    const imageData = await StorageService.downloadPhoto(photo.storagePath)
    const mimeType = (photo.metadata as PhotoMetadata)?.mimeType ?? 'image/jpeg'

    // Optimize with Gemini using preset-specific prompt
    const result = await GeminiService.optimizePhotoWithPreset(imageData, {
      mimeType,
      preset,
      promptGuidance: config.promptGuidance,
    })

    // Upload optimized version
    const optimizedBuffer = Buffer.from(result.imageBase64, 'base64')
    const { publicUrl, storagePath } = await StorageService.uploadOptimizedPhoto(
      userId,
      photoId,
      preset,
      optimizedBuffer,
      result.mimeType
    )

    // Create optimization record
    const details: OptimizationDetails = {
      provider: 'gemini',
      processingTimeMs: Date.now() - startTime,
      adjustments: config.adjustments,
      identityPreservation: result.identityPreservation,
    }

    const [optimization] = await db
      .insert(photoOptimizations)
      .values({
        photoId,
        preset,
        url: publicUrl,
        storagePath,
        details,
      } as NewPhotoOptimization)
      .returning()

    if (!optimization) {
      throw Errors.internal('Failed to create optimization record')
    }

    // Update photo status if all optimizations complete
    const allOptimizations = await getOptimizations(photoId)
    if (allOptimizations.length === 3) {
      await db
        .update(photos)
        .set({ status: 'optimized', updatedAt: new Date() })
        .where(eq(photos.id, photoId))
    }

    return optimization
  } catch (error) {
    console.error(`Optimization error (${preset}):`, error)
    throw error instanceof Error && error.name === 'ApiError'
      ? error
      : Errors.internal(`Failed to optimize photo with ${preset} preset`)
  }
}

/**
 * Optimize a photo with all 3 presets
 * This is the main optimization flow - generates all variants in parallel
 */
export async function optimizeAll(
  photoId: string,
  userId: string
): Promise<{ optimizations: PhotoOptimization[]; photo: Photo }> {
  // Verify photo exists and belongs to user
  const [photo] = await db
    .select()
    .from(photos)
    .where(and(eq(photos.id, photoId), eq(photos.userId, userId)))
    .limit(1)

  if (!photo) {
    throw Errors.notFound('Photo')
  }

  // Check if already optimized
  if (await isFullyOptimized(photoId)) {
    throw Errors.alreadyExists('Photo optimizations')
  }

  // Update status to optimizing
  await db
    .update(photos)
    .set({ status: 'optimizing', updatedAt: new Date() })
    .where(eq(photos.id, photoId))

  try {
    // Get existing optimizations to avoid duplicates
    const existing = await getOptimizations(photoId)
    const existingPresets = new Set(existing.map((o) => o.preset))

    // Determine which presets need to be created
    const presetsToCreate: OptimizationPreset[] = (['professional', 'attractive', 'neutral'] as const).filter(
      (preset) => !existingPresets.has(preset)
    )

    // Create all missing optimizations in parallel
    const newOptimizations = await Promise.all(
      presetsToCreate.map((preset) => optimizeWithPreset(photoId, userId, preset))
    )

    // Get updated photo
    const [updatedPhoto] = await db.select().from(photos).where(eq(photos.id, photoId)).limit(1)

    return {
      optimizations: [...existing, ...newOptimizations],
      photo: updatedPhoto!,
    }
  } catch (error) {
    // Update status to failed
    await db
      .update(photos)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(photos.id, photoId))

    throw error
  }
}

/**
 * Delete all optimizations for a photo
 */
export async function deleteOptimizations(photoId: string): Promise<void> {
  const optimizations = await getOptimizations(photoId)

  // Delete from storage
  for (const opt of optimizations) {
    try {
      await StorageService.deletePhoto(opt.storagePath)
    } catch (error) {
      console.error(`Failed to delete optimization from storage: ${opt.storagePath}`, error)
    }
  }

  // Delete from database
  await db.delete(photoOptimizations).where(eq(photoOptimizations.photoId, photoId))
}

/**
 * Get preset configuration
 */
export function getPresetConfig(preset: OptimizationPreset) {
  return PRESET_CONFIGS[preset]
}

/**
 * Get all preset configurations
 */
export function getAllPresetConfigs() {
  return PRESET_CONFIGS
}
