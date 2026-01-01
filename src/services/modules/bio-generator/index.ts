/**
 * Bio Generator Service
 *
 * Generates context-specific bios for various platforms using AI.
 * Integrates with Identity Brain and learning engine.
 */

import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  type CoreAttributes,
  type GeneratedContent,
  type GenerationParams,
  type LearningState,
  type NewGeneratedContent,
  generatedContent,
  identityBrains,
  personas,
} from '@/db/schema'
import { Errors } from '@/utils/errors'
import * as GeminiService from '../../ai/gemini'
import { buildBioPrompt, buildDatingPromptAnswerPrompt, PLATFORM_SPECS, type PlatformType } from './prompts'
import { logActivity } from '../../companies/stats'

// ============================================
// Types
// ============================================

export interface BioVariation {
  bio: string
  angle: string
  characterCount: number
}

export interface GenerationResult {
  variations: BioVariation[]
  platform: PlatformType
  model: string
  generationId?: string
}

export interface GenerateBioOptions {
  platform: PlatformType
  personaType?: 'professional' | 'dating' | 'social' | 'private'
  customInstructions?: string
  variations?: number
  saveToHistory?: boolean
  companyId?: string
}

export interface GenerateDatingPromptOptions {
  promptQuestion: string
  maxLength?: number
  saveToHistory?: boolean
  companyId?: string
}

// ============================================
// Bio Generation
// ============================================

/**
 * Generate bios for a user
 */
export async function generateBio(
  userId: string,
  options: GenerateBioOptions
): Promise<GenerationResult> {
  const { platform, personaType, customInstructions, variations = 3, saveToHistory = true, companyId } = options

  // Validate platform
  if (!PLATFORM_SPECS[platform]) {
    throw Errors.validation(`Invalid platform: ${platform}`)
  }

  // Get user's identity brain
  const [brain] = await db
    .select()
    .from(identityBrains)
    .where(eq(identityBrains.userId, userId))
    .limit(1)

  if (!brain) {
    throw Errors.notFound('Identity brain', 'Please create an identity brain first')
  }

  const coreAttributes = brain.coreAttributes as CoreAttributes
  const learningState = brain.learningState as LearningState

  // Check if identity brain has been populated with meaningful data
  if (!coreAttributes || !coreAttributes.name) {
    throw Errors.notFound('Identity brain data', 'Please complete your identity brain setup first')
  }

  // Get persona if specified
  let persona
  if (personaType) {
    const [foundPersona] = await db
      .select()
      .from(personas)
      .where(
        and(
          eq(personas.identityBrainId, brain.id),
          eq(personas.personaType, personaType)
        )
      )
      .limit(1)

    if (foundPersona) {
      persona = {
        name: foundPersona.name,
        description: foundPersona.description ?? undefined,
        toneWeights: foundPersona.toneWeights as Record<string, number>,
      }
    }
  }

  // Build learning insights
  const learningInsights = learningState?.contentPatterns
    ? {
        preferredTone: learningState.contentPatterns.preferredTone,
        preferredLength: learningState.contentPatterns.preferredLength,
        favoriteTopics: learningState.contentPatterns.favoriteTopics,
        avoidTopics: learningState.contentPatterns.avoidTopics,
      }
    : undefined

  // Build the prompt
  const prompt = buildBioPrompt({
    platform,
    identity: {
      name: coreAttributes.name,
      occupation: coreAttributes.occupation,
      interests: coreAttributes.interests,
      values: coreAttributes.values,
      personality: coreAttributes.personality,
      goals: coreAttributes.goals,
      quirks: coreAttributes.quirks,
      communicationStyle: coreAttributes.communicationStyle,
    },
    persona,
    learningInsights,
    customInstructions,
    variations,
  })

  // Generate with Gemini
  const response = await GeminiService.generateText(prompt, {
    temperature: 0.8, // Slightly higher for creativity
    maxTokens: 2048,
  })

  // Parse response
  const bioVariations = parseVariationsResponse(response.text)

  // Optionally save to history
  let generationId: string | undefined
  if (saveToHistory && bioVariations.length > 0) {
    // Save the first/best variation
    const bestBio = bioVariations[0]
    if (bestBio) {
      const contentType = getContentTypeForPlatform(platform)

      const newContent: NewGeneratedContent = {
        userId,
        personaId: personaType ? await getPersonaId(brain.id, personaType) : undefined,
        contentType,
        platform,
        content: bestBio.bio,
        prompt,
        model: response.model,
        generationParams: {
          temperature: 0.8,
          persona: personaType,
          customInstructions,
        } as GenerationParams,
        companyId: companyId ?? null,
      }

      const [saved] = await db.insert(generatedContent).values(newContent).returning()
      generationId = saved?.id

      // Log activity if in company context
      if (companyId && saved) {
        try {
          // Check if this is the user's first bio in this company
          const existingBios = await db
            .select({ id: generatedContent.id })
            .from(generatedContent)
            .where(
              and(
                eq(generatedContent.userId, userId),
                eq(generatedContent.companyId, companyId)
              )
            )
            .limit(2)

          // Log first_bio if this is the user's first bio
          if (existingBios.length === 1) {
            await logActivity(companyId, userId, 'first_bio', {
              contentType,
              platform,
            })
          }

          // Also log the content_generated activity
          await logActivity(companyId, userId, 'content_generated', {
            contentType,
            platform,
          })
        } catch (err) {
          console.error('[BioGenerator] Failed to log activity:', err)
        }
      }
    }
  }

  return {
    variations: bioVariations,
    platform,
    model: response.model,
    generationId,
  }
}

/**
 * Generate dating prompt answers
 */
export async function generateDatingPromptAnswer(
  userId: string,
  options: GenerateDatingPromptOptions
): Promise<GenerationResult> {
  const { promptQuestion, maxLength = 150, saveToHistory = true, companyId } = options

  // Get user's identity brain
  const [brain] = await db
    .select()
    .from(identityBrains)
    .where(eq(identityBrains.userId, userId))
    .limit(1)

  if (!brain) {
    throw Errors.notFound('Identity brain', 'Please create an identity brain first')
  }

  const coreAttributes = brain.coreAttributes as CoreAttributes

  // Check if identity brain has been populated with meaningful data
  if (!coreAttributes || !coreAttributes.name) {
    throw Errors.notFound('Identity brain data', 'Please complete your identity brain setup first')
  }

  // Build the prompt
  const prompt = buildDatingPromptAnswerPrompt({
    promptQuestion,
    identity: {
      name: coreAttributes.name,
      interests: coreAttributes.interests,
      personality: coreAttributes.personality,
      quirks: coreAttributes.quirks,
    },
    maxLength,
  })

  // Generate with Gemini
  const response = await GeminiService.generateText(prompt, {
    temperature: 0.85,
    maxTokens: 1024,
  })

  // Parse response
  const variations = parseDatingPromptResponse(response.text)

  // Optionally save to history
  let generationId: string | undefined
  if (saveToHistory && variations.length > 0) {
    const best = variations[0]
    if (best) {
      const newContent: NewGeneratedContent = {
        userId,
        contentType: 'dating_prompt',
        platform: 'hinge',
        title: promptQuestion,
        content: best.bio,
        prompt,
        model: response.model,
        generationParams: {
          temperature: 0.85,
          customInstructions: promptQuestion,
        } as GenerationParams,
        companyId: companyId ?? null,
      }

      const [saved] = await db.insert(generatedContent).values(newContent).returning()
      generationId = saved?.id

      // Log activity if in company context
      if (companyId && saved) {
        try {
          // Check if this is the user's first bio in this company
          const existingBios = await db
            .select({ id: generatedContent.id })
            .from(generatedContent)
            .where(
              and(
                eq(generatedContent.userId, userId),
                eq(generatedContent.companyId, companyId)
              )
            )
            .limit(2)

          // Log first_bio if this is the user's first bio
          if (existingBios.length === 1) {
            await logActivity(companyId, userId, 'first_bio', {
              contentType: 'dating_prompt',
              platform: 'hinge',
            })
          }

          // Also log the content_generated activity
          await logActivity(companyId, userId, 'content_generated', {
            contentType: 'dating_prompt',
            platform: 'hinge',
          })
        } catch (err) {
          console.error('[BioGenerator] Failed to log activity:', err)
        }
      }
    }
  }

  return {
    variations,
    platform: 'hinge',
    model: response.model,
    generationId,
  }
}

// ============================================
// Generated Content Management
// ============================================

/**
 * List user's generated bios
 */
export async function listGeneratedBios(
  userId: string,
  options: {
    platform?: string
    limit?: number
    offset?: number
  } = {}
): Promise<{ bios: GeneratedContent[]; total: number }> {
  const { platform, limit = 20, offset = 0 } = options

  // Build where clause for bio-related content types
  const bioTypes = ['bio', 'linkedin_summary', 'dating_profile', 'dating_prompt']

  const baseCondition = eq(generatedContent.userId, userId)

  const bios = await db
    .select()
    .from(generatedContent)
    .where(baseCondition)
    .orderBy(desc(generatedContent.createdAt))
    .limit(limit)
    .offset(offset)

  // Filter by bio types and platform in memory (simpler than complex SQL)
  let filtered = bios.filter(
    (b) => bioTypes.includes(b.contentType) || b.platform
  )

  if (platform) {
    filtered = filtered.filter((b) => b.platform === platform)
  }

  return {
    bios: filtered.slice(0, limit),
    total: filtered.length,
  }
}

/**
 * Get a specific generated bio
 */
export async function getGeneratedBio(bioId: string, userId: string): Promise<GeneratedContent | null> {
  const [bio] = await db
    .select()
    .from(generatedContent)
    .where(and(eq(generatedContent.id, bioId), eq(generatedContent.userId, userId)))
    .limit(1)

  return bio ?? null
}

/**
 * Delete a generated bio
 */
export async function deleteGeneratedBio(bioId: string, userId: string): Promise<void> {
  const bio = await getGeneratedBio(bioId, userId)
  if (!bio) {
    throw Errors.notFound('Bio')
  }

  await db.delete(generatedContent).where(eq(generatedContent.id, bioId))
}

/**
 * Regenerate a bio with feedback
 */
export async function regenerateBio(
  bioId: string,
  userId: string,
  feedback: string
): Promise<GenerationResult> {
  const bio = await getGeneratedBio(bioId, userId)
  if (!bio) {
    throw Errors.notFound('Bio')
  }

  const platform = (bio.platform ?? 'custom') as PlatformType
  const params = bio.generationParams as GenerationParams

  // Regenerate with feedback as custom instructions
  return generateBio(userId, {
    platform,
    personaType: params.persona as 'professional' | 'dating' | 'social' | 'private',
    customInstructions: `Previous attempt was: "${bio.content}"\nUser feedback: ${feedback}\nPlease improve based on this feedback.`,
    variations: 3,
    saveToHistory: true,
  })
}

/**
 * Get supported platforms
 */
export function getSupportedPlatforms() {
  return Object.entries(PLATFORM_SPECS).map(([key, spec]) => ({
    id: key,
    name: spec.name,
    maxLength: spec.maxLength,
    style: spec.style,
  }))
}

// ============================================
// Helpers
// ============================================

function parseVariationsResponse(text: string): BioVariation[] {
  try {
    // Clean the response
    let cleanText = text.trim()
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7)
    }
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3)
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3)
    }
    cleanText = cleanText.trim()

    const parsed = JSON.parse(cleanText)

    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        bio: item.bio ?? item.answer ?? '',
        angle: item.angle ?? item.approach ?? '',
        characterCount: item.characterCount ?? (item.bio ?? item.answer ?? '').length,
      }))
    }

    return []
  } catch {
    console.error('Failed to parse bio variations')
    return []
  }
}

function parseDatingPromptResponse(text: string): BioVariation[] {
  try {
    let cleanText = text.trim()
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7)
    }
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3)
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3)
    }
    cleanText = cleanText.trim()

    const parsed = JSON.parse(cleanText)

    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        bio: item.answer ?? item.bio ?? '',
        angle: item.approach ?? item.angle ?? '',
        characterCount: item.characterCount ?? (item.answer ?? item.bio ?? '').length,
      }))
    }

    return []
  } catch {
    console.error('Failed to parse dating prompt response')
    return []
  }
}

function getContentTypeForPlatform(platform: PlatformType): GeneratedContent['contentType'] {
  switch (platform) {
    case 'linkedin_summary':
    case 'linkedin_headline':
      return 'linkedin_summary'
    case 'tinder':
    case 'hinge':
    case 'bumble':
    case 'general_dating':
      return 'dating_profile'
    default:
      return 'bio'
  }
}

async function getPersonaId(
  identityBrainId: string,
  personaType: string
): Promise<string | undefined> {
  const [persona] = await db
    .select({ id: personas.id })
    .from(personas)
    .where(
      and(
        eq(personas.identityBrainId, identityBrainId),
        eq(personas.personaType, personaType as 'professional' | 'dating' | 'social' | 'private')
      )
    )
    .limit(1)

  return persona?.id
}

// Re-export types and utilities
export { PLATFORM_SPECS, type PlatformType } from './prompts'
