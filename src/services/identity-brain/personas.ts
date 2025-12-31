/**
 * Persona Service
 *
 * Manages user personas (Professional, Dating, Social, Private)
 * Each persona has custom tone weights, style markers, and content rules
 */

import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  type ContentRules,
  type NewPersona,
  type Persona,
  personas,
} from '@/db/schema'
import { Errors } from '@/utils/errors'

export type PersonaType = 'professional' | 'dating' | 'social' | 'private'

/**
 * Standard tone weight dimensions used across all personas
 * Each value is on a 0-1 scale
 */
interface ToneWeights extends Record<string, number> {
  confident: number
  friendly: number
  witty: number
  vulnerable: number
  direct: number
}

const DEFAULT_PERSONA_CONFIGS: Record<
  PersonaType,
  { name: string; description: string; toneWeights: ToneWeights; contentRules: ContentRules }
> = {
  professional: {
    name: 'Professional',
    description: 'For work, LinkedIn, resumes, and career-related content',
    toneWeights: { confident: 0.8, friendly: 0.5, witty: 0.3, vulnerable: 0.2, direct: 0.8 },
    contentRules: { formality: 'formal', includeEmoji: false },
  },
  dating: {
    name: 'Dating',
    description: 'For dating profiles, conversations, and romantic contexts',
    toneWeights: { confident: 0.6, friendly: 0.8, witty: 0.7, vulnerable: 0.5, direct: 0.4 },
    contentRules: { formality: 'casual', includeEmoji: true },
  },
  social: {
    name: 'Social',
    description: 'For social media, casual posts, and general online presence',
    toneWeights: { confident: 0.5, friendly: 0.8, witty: 0.6, vulnerable: 0.4, direct: 0.5 },
    contentRules: { formality: 'casual', includeEmoji: true },
  },
  private: {
    name: 'Private',
    description: 'Personal notes and private content',
    toneWeights: { confident: 0.5, friendly: 0.5, witty: 0.5, vulnerable: 0.8, direct: 0.5 },
    contentRules: { formality: 'casual' },
  },
}

/**
 * Create all default personas for a new identity brain
 */
export async function createPersonasForBrain(identityBrainId: string): Promise<Persona[]> {
  const personaTypes: PersonaType[] = ['professional', 'dating', 'social', 'private']

  const personaValues: NewPersona[] = personaTypes.map((type) => ({
    identityBrainId,
    personaType: type,
    name: DEFAULT_PERSONA_CONFIGS[type].name,
    description: DEFAULT_PERSONA_CONFIGS[type].description,
    toneWeights: DEFAULT_PERSONA_CONFIGS[type].toneWeights,
    styleMarkers: [],
    contentRules: DEFAULT_PERSONA_CONFIGS[type].contentRules,
    isActive: type === 'professional', // Professional is active by default
  }))

  const created = await db.insert(personas).values(personaValues).returning()

  return created
}

/**
 * Get all personas for an identity brain
 */
export async function getByIdentityBrainId(identityBrainId: string): Promise<Persona[]> {
  return db.select().from(personas).where(eq(personas.identityBrainId, identityBrainId))
}

/**
 * Get a specific persona by type
 */
export async function getByType(identityBrainId: string, type: PersonaType): Promise<Persona | null> {
  const [persona] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.identityBrainId, identityBrainId), eq(personas.personaType, type)))
    .limit(1)

  return persona ?? null
}

/**
 * Get the currently active persona
 */
export async function getActive(identityBrainId: string): Promise<Persona | null> {
  const [persona] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.identityBrainId, identityBrainId), eq(personas.isActive, true)))
    .limit(1)

  return persona ?? null
}

/**
 * Create a new persona
 */
export async function create(
  identityBrainId: string,
  data: {
    personaType: PersonaType
    name: string
    description?: string
    toneWeights?: Record<string, number>
    styleMarkers?: string[]
    contentRules?: ContentRules
  }
): Promise<Persona> {
  // Check if persona of this type already exists
  const existing = await getByType(identityBrainId, data.personaType)
  if (existing) {
    throw Errors.alreadyExists('Persona of this type')
  }

  const [persona] = await db
    .insert(personas)
    .values({
      identityBrainId,
      personaType: data.personaType,
      name: data.name,
      description: data.description,
      toneWeights: data.toneWeights ?? {},
      styleMarkers: data.styleMarkers ?? [],
      contentRules: data.contentRules ?? {},
      isActive: false,
    })
    .returning()

  if (!persona) {
    throw Errors.internal('Failed to create persona')
  }

  return persona
}

/**
 * Update a persona
 */
export async function update(
  identityBrainId: string,
  type: PersonaType,
  data: Partial<Pick<Persona, 'name' | 'description' | 'toneWeights' | 'styleMarkers' | 'contentRules'>>
): Promise<Persona> {
  const existing = await getByType(identityBrainId, type)
  if (!existing) {
    throw Errors.notFound('Persona')
  }

  const [updated] = await db
    .update(personas)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(personas.identityBrainId, identityBrainId), eq(personas.personaType, type)))
    .returning()

  if (!updated) {
    throw Errors.internal('Failed to update persona')
  }

  return updated
}

/**
 * Set a persona as active (deactivates others)
 */
export async function activate(identityBrainId: string, type: PersonaType): Promise<Persona> {
  const persona = await getByType(identityBrainId, type)
  if (!persona) {
    throw Errors.notFound('Persona')
  }

  // Deactivate all personas for this identity brain
  await db
    .update(personas)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(personas.identityBrainId, identityBrainId))

  // Activate the selected persona
  const [activated] = await db
    .update(personas)
    .set({ isActive: true, updatedAt: new Date() })
    .where(and(eq(personas.identityBrainId, identityBrainId), eq(personas.personaType, type)))
    .returning()

  if (!activated) {
    throw Errors.internal('Failed to activate persona')
  }

  return activated
}

/**
 * Delete a persona (cannot delete default types)
 */
export async function remove(identityBrainId: string, type: PersonaType): Promise<void> {
  // Prevent deletion of core persona types
  const coreTypes: PersonaType[] = ['professional', 'dating', 'social', 'private']
  if (coreTypes.includes(type)) {
    throw Errors.forbidden('Cannot delete core persona types')
  }

  const existing = await getByType(identityBrainId, type)
  if (!existing) {
    throw Errors.notFound('Persona')
  }

  await db
    .delete(personas)
    .where(and(eq(personas.identityBrainId, identityBrainId), eq(personas.personaType, type)))
}
