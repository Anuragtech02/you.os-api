/**
 * Identity Brain Embedding Service
 *
 * Generates and manages embeddings for identity brains.
 * Creates a unified identity embedding blended with context-specific embeddings.
 */

import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  type CoreAttributes,
  type AestheticState,
  type LearningState,
  type IdentityBrain,
  type Persona,
  identityBrains,
  personas,
} from '@/db/schema'
import { Errors } from '@/utils/errors'
import {
  generateEmbedding,
  blendEmbeddings,
  EMBEDDING_CONFIG,
} from '@/services/ai/embeddings'

export interface EmbeddingStatus {
  hasIdentityEmbedding: boolean
  hasContentEmbedding: boolean
  embeddingModel: string | null
  lastUpdatedAt: string | null
}

/**
 * Build a text representation of identity for embedding
 */
export function buildIdentityText(brain: IdentityBrain): string {
  const attrs = brain.coreAttributes as CoreAttributes
  const aesthetic = brain.aestheticState as AestheticState
  const learning = brain.learningState as LearningState

  const parts: string[] = []

  // Core identity
  if (attrs.name) parts.push(`Name: ${attrs.name}`)
  if (attrs.occupation) parts.push(`Occupation: ${attrs.occupation}`)
  if (attrs.location) parts.push(`Location: ${attrs.location}`)

  // Personality and values
  if (attrs.personality?.length) {
    parts.push(`Personality: ${attrs.personality.join(', ')}`)
  }
  if (attrs.values?.length) {
    parts.push(`Values: ${attrs.values.join(', ')}`)
  }
  if (attrs.interests?.length) {
    parts.push(`Interests: ${attrs.interests.join(', ')}`)
  }
  if (attrs.goals?.length) {
    parts.push(`Goals: ${attrs.goals.join(', ')}`)
  }
  if (attrs.quirks?.length) {
    parts.push(`Unique traits: ${attrs.quirks.join(', ')}`)
  }
  if (attrs.communicationStyle) {
    parts.push(`Communication style: ${attrs.communicationStyle}`)
  }

  // Aesthetic preferences
  if (aesthetic.styleArchetype) {
    parts.push(`Style archetype: ${aesthetic.styleArchetype}`)
  }
  if (aesthetic.colorPalette?.season) {
    parts.push(`Color season: ${aesthetic.colorPalette.season}`)
  }

  // Learning patterns
  const patterns = learning.contentPatterns
  if (patterns?.preferredTone?.length) {
    parts.push(`Preferred tone: ${patterns.preferredTone.join(', ')}`)
  }
  if (patterns?.favoriteTopics?.length) {
    parts.push(`Favorite topics: ${patterns.favoriteTopics.join(', ')}`)
  }

  return parts.join('. ')
}

/**
 * Build text representation for a specific persona context
 */
export function buildPersonaContextText(persona: Persona): string {
  const parts: string[] = []

  parts.push(`Context: ${persona.name}`)
  if (persona.description) {
    parts.push(persona.description)
  }

  // Tone weights
  const toneWeights = persona.toneWeights as Record<string, number>
  const dominantTones = Object.entries(toneWeights)
    .filter(([, weight]) => weight > 0.5)
    .map(([tone]) => tone)
  if (dominantTones.length) {
    parts.push(`Tone: ${dominantTones.join(', ')}`)
  }

  // Style markers
  const styleMarkers = persona.styleMarkers as string[]
  if (styleMarkers.length) {
    parts.push(`Style: ${styleMarkers.join(', ')}`)
  }

  return parts.join('. ')
}

/**
 * Generate unified identity embedding
 */
export async function generateIdentityEmbedding(brain: IdentityBrain): Promise<number[]> {
  const identityText = buildIdentityText(brain)

  if (!identityText) {
    throw Errors.validation('Identity brain has no content to embed')
  }

  const result = await generateEmbedding(identityText)
  return result.embedding
}

/**
 * Generate content embedding (blended with active persona)
 */
export async function generateContentEmbedding(
  brain: IdentityBrain,
  activePersona?: Persona
): Promise<number[]> {
  // Generate base identity embedding
  const identityText = buildIdentityText(brain)
  if (!identityText) {
    throw Errors.validation('Identity brain has no content to embed')
  }

  const identityResult = await generateEmbedding(identityText)

  // If no active persona, return identity embedding
  if (!activePersona) {
    return identityResult.embedding
  }

  // Generate persona context embedding
  const personaText = buildPersonaContextText(activePersona)
  if (!personaText) {
    return identityResult.embedding
  }

  const personaResult = await generateEmbedding(personaText)

  // Blend: 80% identity + 20% persona context
  return blendEmbeddings(identityResult.embedding, personaResult.embedding, 0.8)
}

/**
 * Regenerate all embeddings for an identity brain
 */
export async function regenerateEmbeddings(identityBrainId: string): Promise<{
  identityEmbedding: number[]
  contentEmbedding: number[]
}> {
  // Get identity brain
  const [brain] = await db
    .select()
    .from(identityBrains)
    .where(eq(identityBrains.id, identityBrainId))
    .limit(1)

  if (!brain) {
    throw Errors.notFound('Identity brain')
  }

  // Get active persona
  const [activePersona] = await db
    .select()
    .from(personas)
    .where(eq(personas.identityBrainId, identityBrainId))
    .limit(1)

  // Generate embeddings
  const identityEmbedding = await generateIdentityEmbedding(brain)
  const contentEmbedding = await generateContentEmbedding(brain, activePersona ?? undefined)

  // Update identity brain with new embeddings
  await db
    .update(identityBrains)
    .set({
      identityEmbedding,
      contentEmbedding,
      updatedAt: new Date(),
    })
    .where(eq(identityBrains.id, identityBrainId))

  return { identityEmbedding, contentEmbedding }
}

/**
 * Get embedding status for an identity brain
 */
export async function getEmbeddingStatus(identityBrainId: string): Promise<EmbeddingStatus> {
  const [brain] = await db
    .select({
      identityEmbedding: identityBrains.identityEmbedding,
      contentEmbedding: identityBrains.contentEmbedding,
      updatedAt: identityBrains.updatedAt,
    })
    .from(identityBrains)
    .where(eq(identityBrains.id, identityBrainId))
    .limit(1)

  if (!brain) {
    throw Errors.notFound('Identity brain')
  }

  return {
    hasIdentityEmbedding: brain.identityEmbedding !== null,
    hasContentEmbedding: brain.contentEmbedding !== null,
    embeddingModel: brain.identityEmbedding ? EMBEDDING_CONFIG.model : null,
    lastUpdatedAt: brain.identityEmbedding ? brain.updatedAt.toISOString() : null,
  }
}
