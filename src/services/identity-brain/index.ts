/**
 * Identity Brain Service
 *
 * Core CRUD operations for the Identity Brain - the central engine
 * that stores user identity data and provides context for all AI modules.
 */

import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  type CoreAttributes,
  type AestheticState,
  type LearningState,
  type IdentityBrain,
  type NewIdentityBrain,
  identityBrains,
  personas,
} from '@/db/schema'
import { Errors } from '@/utils/errors'
import { createPersonasForBrain } from './personas'
import { createVersion } from './versions'

/**
 * Get identity brain by user ID
 */
export async function getByUserId(userId: string): Promise<IdentityBrain | null> {
  const [brain] = await db
    .select()
    .from(identityBrains)
    .where(eq(identityBrains.userId, userId))
    .limit(1)

  return brain ?? null
}

/**
 * Get identity brain by ID
 */
export async function getById(id: string): Promise<IdentityBrain | null> {
  const [brain] = await db.select().from(identityBrains).where(eq(identityBrains.id, id)).limit(1)

  return brain ?? null
}

/**
 * Get identity brain with personas included
 */
export async function getWithPersonas(userId: string) {
  const brain = await getByUserId(userId)

  if (!brain) {
    return null
  }

  const userPersonas = await db
    .select()
    .from(personas)
    .where(eq(personas.identityBrainId, brain.id))

  return {
    ...brain,
    personas: userPersonas,
  }
}

/**
 * Create identity brain for a user
 * Also creates default personas (Professional, Dating, Social, Private)
 */
export async function create(
  userId: string,
  data?: Partial<Pick<NewIdentityBrain, 'coreAttributes' | 'aestheticState' | 'learningState'>>
): Promise<IdentityBrain> {
  // Check if user already has an identity brain
  const existing = await getByUserId(userId)
  if (existing) {
    throw Errors.alreadyExists('Identity brain')
  }

  // Create identity brain
  const [brain] = await db
    .insert(identityBrains)
    .values({
      userId,
      coreAttributes: data?.coreAttributes ?? getDefaultCoreAttributes(),
      aestheticState: data?.aestheticState ?? getDefaultAestheticState(),
      learningState: data?.learningState ?? getDefaultLearningState(),
    })
    .returning()

  if (!brain) {
    throw Errors.internal('Failed to create identity brain')
  }

  // Create default personas
  await createPersonasForBrain(brain.id)

  return brain
}

/**
 * Update identity brain
 */
export async function update(
  id: string,
  data: Partial<Pick<IdentityBrain, 'coreAttributes' | 'aestheticState' | 'learningState'>>,
  createVersionSnapshot = true
): Promise<IdentityBrain> {
  const existing = await getById(id)
  if (!existing) {
    throw Errors.notFound('Identity brain')
  }

  // Create version before updating
  if (createVersionSnapshot) {
    await createVersion(existing)
  }

  const [updated] = await db
    .update(identityBrains)
    .set({
      ...data,
      currentVersion: existing.currentVersion + 1,
      updatedAt: new Date(),
    })
    .where(eq(identityBrains.id, id))
    .returning()

  if (!updated) {
    throw Errors.internal('Failed to update identity brain')
  }

  return updated
}

/**
 * Update core attributes only
 */
export async function updateCoreAttributes(
  id: string,
  attributes: Partial<CoreAttributes>
): Promise<IdentityBrain> {
  const existing = await getById(id)
  if (!existing) {
    throw Errors.notFound('Identity brain')
  }

  // Merge with existing attributes
  const merged: CoreAttributes = {
    ...existing.coreAttributes,
    ...attributes,
  }

  return update(id, { coreAttributes: merged })
}

/**
 * Update aesthetic state only
 */
export async function updateAestheticState(
  id: string,
  aesthetic: Partial<AestheticState>
): Promise<IdentityBrain> {
  const existing = await getById(id)
  if (!existing) {
    throw Errors.notFound('Identity brain')
  }

  // Merge with existing aesthetic state
  const merged: AestheticState = {
    ...existing.aestheticState,
    ...aesthetic,
  }

  return update(id, { aestheticState: merged })
}

/**
 * Update learning state only
 */
export async function updateLearningState(
  id: string,
  learning: Partial<LearningState>
): Promise<IdentityBrain> {
  const existing = await getById(id)
  if (!existing) {
    throw Errors.notFound('Identity brain')
  }

  // Merge with existing learning state
  const merged: LearningState = {
    ...existing.learningState,
    ...learning,
  }

  return update(id, { learningState: merged }, false) // Don't create version for learning updates
}

/**
 * Update sync status
 */
export async function updateSyncStatus(
  id: string,
  status: 'idle' | 'in_progress' | 'completed' | 'failed'
): Promise<void> {
  await db
    .update(identityBrains)
    .set({
      syncStatus: status,
      lastSyncedAt: status === 'completed' ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(identityBrains.id, id))
}

/**
 * Delete identity brain (cascades to personas and versions)
 */
export async function remove(id: string): Promise<void> {
  const existing = await getById(id)
  if (!existing) {
    throw Errors.notFound('Identity brain')
  }

  await db.delete(identityBrains).where(eq(identityBrains.id, id))
}

// Default state factories
function getDefaultCoreAttributes(): CoreAttributes {
  return {
    name: undefined,
    age: undefined,
    location: undefined,
    occupation: undefined,
    interests: [],
    values: [],
    personality: [],
    goals: [],
    quirks: [],
    communicationStyle: undefined,
  }
}

function getDefaultAestheticState(): AestheticState {
  return {
    colorPalette: undefined,
    styleArchetype: undefined,
    hairSuggestions: [],
    makeupSuggestions: [],
    wardrobeGuidance: [],
    lastAnalyzedAt: undefined,
  }
}

function getDefaultLearningState(): LearningState {
  return {
    feedbackHistory: [],
    contentPatterns: {
      preferredLength: undefined,
      preferredTone: [],
      avoidTopics: [],
      favoriteTopics: [],
    },
    performanceMetrics: {
      totalGenerations: 0,
      positiveRatings: 0,
      negativeRatings: 0,
      averageScore: 0,
    },
    lastLearnedAt: undefined,
  }
}

// Re-export types and sub-services
export type { PersonaType } from './personas'
export * as PersonaService from './personas'
export * as VersionService from './versions'
