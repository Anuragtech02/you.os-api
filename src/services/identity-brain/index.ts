/**
 * Identity Brain Service
 *
 * Core CRUD operations for the Identity Brain - the central engine
 * that stores user identity data and provides context for all AI modules.
 */

import { eq, and } from 'drizzle-orm'
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
import { companyCandidates, companyActivities } from '@/db/schema/companies'
import { Errors } from '@/utils/errors'
import { createPersonasForBrain } from './personas'
import { createVersion } from './versions'
import { logActivity } from '../companies/stats'

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

  // Calculate previous completion score
  const previousScore = calculateCompletionScore(existing.coreAttributes)

  // Merge with existing attributes
  const merged: CoreAttributes = {
    ...existing.coreAttributes,
    ...attributes,
  }

  const updated = await update(id, { coreAttributes: merged })

  // Check if user just crossed 80% completion threshold
  const newScore = calculateCompletionScore(merged)
  if (previousScore < 80 && newScore >= 80) {
    // Log identity completion activity for all companies the user belongs to
    try {
      await logIdentityCompletionActivity(existing.userId)
    } catch (err) {
      console.error('[IdentityBrain] Failed to log completion activity:', err)
    }
  }

  return updated
}

/**
 * Log identity completion activity for all companies a user belongs to
 * Only logs once per user per company
 */
async function logIdentityCompletionActivity(userId: string): Promise<void> {
  // Get all companies the user is a member of
  const memberships = await db
    .select({ companyId: companyCandidates.companyId })
    .from(companyCandidates)
    .where(eq(companyCandidates.userId, userId))

  for (const { companyId } of memberships) {
    // Check if we've already logged this activity for this user in this company
    const [existing] = await db
      .select({ id: companyActivities.id })
      .from(companyActivities)
      .where(
        and(
          eq(companyActivities.companyId, companyId),
          eq(companyActivities.userId, userId),
          eq(companyActivities.type, 'identity_completed')
        )
      )
      .limit(1)

    if (!existing) {
      await logActivity(companyId, userId, 'identity_completed', {
        details: 'User reached 80% identity completion',
      })
    }
  }
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

// ============================================
// Completion Score Calculation
// ============================================

/**
 * Fields used for completion score calculation with their weights
 */
const COMPLETION_FIELDS: { field: keyof CoreAttributes; weight: number; isArray?: boolean }[] = [
  { field: 'name', weight: 15 },
  { field: 'age', weight: 5 },
  { field: 'location', weight: 10 },
  { field: 'occupation', weight: 10 },
  { field: 'headline', weight: 10 },
  { field: 'shortBio', weight: 15 },
  { field: 'interests', weight: 10, isArray: true },
  { field: 'values', weight: 5, isArray: true },
  { field: 'personality', weight: 5, isArray: true },
  { field: 'goals', weight: 5, isArray: true },
  { field: 'quirks', weight: 5, isArray: true },
  { field: 'communicationStyle', weight: 5 },
]

/**
 * Calculate the completion score for an identity brain (0-100)
 */
export function calculateCompletionScore(coreAttributes: CoreAttributes): number {
  let score = 0
  const totalWeight = COMPLETION_FIELDS.reduce((sum, f) => sum + f.weight, 0)

  for (const { field, weight, isArray } of COMPLETION_FIELDS) {
    const value = coreAttributes[field]

    if (isArray) {
      // For arrays, check if they have at least one item
      if (Array.isArray(value) && value.length > 0) {
        score += weight
      }
    } else {
      // For scalar values, check if they're defined and not empty
      if (value !== undefined && value !== null && value !== '') {
        score += weight
      }
    }
  }

  // Normalize to 0-100
  return Math.round((score / totalWeight) * 100)
}

/**
 * Get completion details showing which fields are filled
 */
export function getCompletionDetails(coreAttributes: CoreAttributes): {
  score: number
  filledFields: string[]
  missingFields: string[]
} {
  const filledFields: string[] = []
  const missingFields: string[] = []

  for (const { field, isArray } of COMPLETION_FIELDS) {
    const value = coreAttributes[field]

    const isFilled = isArray
      ? Array.isArray(value) && value.length > 0
      : value !== undefined && value !== null && value !== ''

    if (isFilled) {
      filledFields.push(String(field))
    } else {
      missingFields.push(String(field))
    }
  }

  return {
    score: calculateCompletionScore(coreAttributes),
    filledFields,
    missingFields,
  }
}

// Re-export types and sub-services
export type { PersonaType } from './personas'
export * as PersonaService from './personas'
export * as VersionService from './versions'
