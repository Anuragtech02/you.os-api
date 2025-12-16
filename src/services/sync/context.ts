/**
 * Sync Context Builder
 *
 * Builds the generation context used by all modules during sync.
 * This ensures consistent data access across the sync process.
 */

import { db } from '@/db/client'
import { identityBrains, personas, type Persona } from '@/db/schema/identity-brain'
import { photos, type Photo } from '@/db/schema/photos'
import { generatedContent } from '@/db/schema/content'
import { eq, desc, isNull, and } from 'drizzle-orm'
import type { CoreAttributes, AestheticState, LearningState } from '@/db/schema/identity-brain'

export interface GenerationContext {
  identity: {
    brainId: string
    coreAttributes: CoreAttributes
    aestheticState: AestheticState
    learningState: LearningState
    identityEmbedding: number[] | null
    currentVersion: number
  }
  personas: {
    professional: Persona | null
    dating: Persona | null
    social: Persona | null
    private: Persona | null
  }
  photos: Photo[]
  recentGenerations: {
    id: string
    contentType: string
    createdAt: Date
  }[]
  preferences: {
    toneWeights: Record<string, number>
    lengthPreference: 'concise' | 'standard' | 'detailed'
    styleMarkers: string[]
  }
}

/**
 * Build the full generation context for a user
 */
export async function buildGenerationContext(userId: string): Promise<GenerationContext | null> {
  // Get identity brain
  const [brain] = await db
    .select()
    .from(identityBrains)
    .where(eq(identityBrains.userId, userId))
    .limit(1)

  if (!brain) {
    return null
  }

  // Get all personas (linked via identity brain)
  const userPersonas = await db
    .select()
    .from(personas)
    .where(eq(personas.identityBrainId, brain.id))

  const personaMap = {
    professional: userPersonas.find((p: Persona) => p.personaType === 'professional') || null,
    dating: userPersonas.find((p: Persona) => p.personaType === 'dating') || null,
    social: userPersonas.find((p: Persona) => p.personaType === 'social') || null,
    private: userPersonas.find((p: Persona) => p.personaType === 'private') || null,
  }

  // Get user's photos (not deleted, with analysis preferred)
  const userPhotos = await db
    .select()
    .from(photos)
    .where(and(eq(photos.userId, userId), isNull(photos.deletedAt)))
    .orderBy(desc(photos.isPrimary), desc(photos.createdAt))
    .limit(20)

  // Get recent generations for context
  const recentGens = await db
    .select({
      id: generatedContent.id,
      contentType: generatedContent.contentType,
      createdAt: generatedContent.createdAt,
    })
    .from(generatedContent)
    .where(eq(generatedContent.userId, userId))
    .orderBy(desc(generatedContent.createdAt))
    .limit(10)

  // Extract preferences from learning state
  const learningState = (brain.learningState || {}) as LearningState
  const preferences = extractPreferences(learningState)

  return {
    identity: {
      brainId: brain.id,
      coreAttributes: brain.coreAttributes as CoreAttributes,
      aestheticState: (brain.aestheticState || {}) as AestheticState,
      learningState,
      identityEmbedding: brain.identityEmbedding,
      currentVersion: brain.currentVersion,
    },
    personas: personaMap,
    photos: userPhotos,
    recentGenerations: recentGens,
    preferences,
  }
}

/**
 * Extract user preferences from learning state
 */
function extractPreferences(learningState: LearningState): GenerationContext['preferences'] {
  const toneWeights: Record<string, number> = {}
  const styleMarkers: string[] = []
  let lengthPreference: 'concise' | 'standard' | 'detailed' = 'standard'

  // Learning state is a flexible JSONB - cast to record for access
  const state = learningState as Record<string, unknown>

  // Extract from feedback patterns if available
  if (state.feedbackPatterns) {
    const patterns = state.feedbackPatterns as Record<string, unknown>

    // Analyze tone preferences
    if (patterns.preferredTones && Array.isArray(patterns.preferredTones)) {
      for (const tone of patterns.preferredTones) {
        toneWeights[tone as string] = (toneWeights[tone as string] || 0) + 1
      }
    }

    // Analyze length preferences
    if (patterns.lengthFeedback) {
      const feedback = patterns.lengthFeedback as Record<string, number>
      const tooLong = feedback.tooLong ?? 0
      const tooShort = feedback.tooShort ?? 0
      if (tooLong > tooShort) {
        lengthPreference = 'concise'
      } else if (tooShort > tooLong) {
        lengthPreference = 'detailed'
      }
    }

    // Extract style markers
    if (patterns.styleMarkers && Array.isArray(patterns.styleMarkers)) {
      styleMarkers.push(...(patterns.styleMarkers as string[]))
    }
  }

  // Default tone weights if none found
  if (Object.keys(toneWeights).length === 0) {
    toneWeights['professional'] = 1
    toneWeights['friendly'] = 1
  }

  return {
    toneWeights,
    lengthPreference,
    styleMarkers,
  }
}

/**
 * Get a simplified context for a specific module
 */
export async function getModuleContext(
  userId: string,
  moduleName: string
): Promise<Partial<GenerationContext> | null> {
  const fullContext = await buildGenerationContext(userId)
  if (!fullContext) return null

  // Return relevant subset based on module
  switch (moduleName) {
    case 'photo_engine':
      return {
        identity: fullContext.identity,
        photos: fullContext.photos,
        preferences: fullContext.preferences,
      }

    case 'bio_generator':
      return {
        identity: fullContext.identity,
        personas: fullContext.personas,
        preferences: fullContext.preferences,
      }

    case 'career_module':
      return {
        identity: fullContext.identity,
        personas: { ...fullContext.personas, dating: null, social: null },
        preferences: fullContext.preferences,
      }

    case 'dating_module':
      return {
        identity: fullContext.identity,
        personas: { ...fullContext.personas, professional: null },
        photos: fullContext.photos,
        preferences: fullContext.preferences,
      }

    case 'aesthetic_module':
      return {
        identity: fullContext.identity,
        photos: fullContext.photos,
        preferences: fullContext.preferences,
      }

    default:
      return fullContext
  }
}
