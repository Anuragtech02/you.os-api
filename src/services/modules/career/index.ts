/**
 * Career Module Service
 *
 * Generates professional career documents including resumes, cover letters,
 * LinkedIn content, and elevator pitches using AI.
 */

import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  type CoreAttributes,
  type GeneratedContent,
  type GenerationParams,
  type NewGeneratedContent,
  generatedContent,
  identityBrains,
} from '@/db/schema'
import { Errors } from '@/utils/errors'
import * as GeminiService from '../../ai/gemini'
import {
  buildCoverLetterPrompt,
  buildElevatorPitchPrompt,
  buildLinkedInHeadlinePrompt,
  buildLinkedInSummaryPrompt,
  buildResumeBulletsPrompt,
  buildResumeSummaryPrompt,
  type CareerDocumentType,
  type CareerIdentity,
  DOCUMENT_SPECS,
  type ExperienceItem,
} from './prompts'

// ============================================
// Types
// ============================================

export interface ResumeSummaryResult {
  summaries: Array<{
    summary: string
    angle: string
    characterCount: number
  }>
  model: string
  generationId?: string
}

export interface ResumeBulletsResult {
  bullets: Array<{
    bullet: string
    category: string
    strength: string
    characterCount: number
  }>
  model: string
  generationId?: string
}

export interface CoverLetterResult {
  coverLetter: string
  keyPoints: string[]
  wordCount: number
  model: string
  generationId?: string
}

export interface LinkedInHeadlineResult {
  headlines: Array<{
    headline: string
    style: string
    searchTerms: string[]
    characterCount: number
  }>
  model: string
  generationId?: string
}

export interface LinkedInSummaryResult {
  summaries: Array<{
    summary: string
    style: string
    keyThemes: string[]
    characterCount: number
  }>
  model: string
  generationId?: string
}

export interface ElevatorPitchResult {
  pitches: Array<{
    pitch: string
    style: string
    hook: string
    wordCount: number
  }>
  model: string
  generationId?: string
}

export interface GenerateResumeSummaryOptions {
  targetRole?: string
  industry?: string
  customInstructions?: string
  saveToHistory?: boolean
}

export interface GenerateResumeBulletsOptions {
  experienceItems?: ExperienceItem[]
  targetRole?: string
  customInstructions?: string
  saveToHistory?: boolean
}

export interface GenerateCoverLetterOptions {
  targetRole: string
  targetCompany: string
  jobDescription?: string
  customInstructions?: string
  saveToHistory?: boolean
}

export interface GenerateLinkedInOptions {
  targetAudience?: string
  keywords?: string[]
  customInstructions?: string
  saveToHistory?: boolean
}

export interface GenerateElevatorPitchOptions {
  duration: '30_seconds' | '60_seconds'
  context?: 'networking' | 'interview' | 'casual' | 'investor'
  customInstructions?: string
  saveToHistory?: boolean
}

// ============================================
// Helper: Build Career Identity from Brain
// ============================================

async function getCareerIdentity(userId: string): Promise<{ identity: CareerIdentity; brainId: string }> {
  const [brain] = await db
    .select()
    .from(identityBrains)
    .where(eq(identityBrains.userId, userId))
    .limit(1)

  if (!brain) {
    throw Errors.notFound('Identity brain', 'Please create an identity brain first')
  }

  const coreAttributes = brain.coreAttributes as CoreAttributes

  if (!coreAttributes || !coreAttributes.name) {
    throw Errors.notFound('Identity brain data', 'Please complete your identity brain setup first')
  }

  // Extract career-related info from coreAttributes (which allows additional fields)
  const identity: CareerIdentity = {
    name: coreAttributes.name,
    occupation: coreAttributes.occupation,
    industry: coreAttributes.industry as string | undefined,
    yearsExperience: coreAttributes.yearsExperience as number | undefined,
    skills: (coreAttributes.skills as string[] | undefined) ?? coreAttributes.interests,
    achievements: coreAttributes.achievements as string[] | undefined,
    education: coreAttributes.education as string | undefined,
    values: coreAttributes.values,
    goals: coreAttributes.goals,
    communicationStyle: coreAttributes.communicationStyle,
  }

  return { identity, brainId: brain.id }
}

// ============================================
// Resume Summary Generation
// ============================================

export async function generateResumeSummary(
  userId: string,
  options: GenerateResumeSummaryOptions = {}
): Promise<ResumeSummaryResult> {
  const { targetRole, industry, customInstructions, saveToHistory = true } = options

  const { identity } = await getCareerIdentity(userId)

  const prompt = buildResumeSummaryPrompt({
    identity,
    targetRole,
    industry,
    customInstructions,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.7,
    maxTokens: 2048,
  })

  const summaries = parseArrayResponse<{
    summary: string
    angle: string
    characterCount: number
  }>(response.text)

  let generationId: string | undefined
  if (saveToHistory && summaries.length > 0) {
    const best = summaries[0]
    if (best) {
      const newContent: NewGeneratedContent = {
        userId,
        contentType: 'resume',
        platform: 'resume',
        title: targetRole ? `Resume Summary - ${targetRole}` : 'Resume Summary',
        content: best.summary,
        prompt,
        model: response.model,
        generationParams: {
          temperature: 0.7,
          customInstructions,
        } as GenerationParams,
      }

      const [saved] = await db.insert(generatedContent).values(newContent).returning()
      generationId = saved?.id
    }
  }

  return {
    summaries,
    model: response.model,
    generationId,
  }
}

// ============================================
// Resume Bullets Generation
// ============================================

export async function generateResumeBullets(
  userId: string,
  options: GenerateResumeBulletsOptions = {}
): Promise<ResumeBulletsResult> {
  const { experienceItems, targetRole, customInstructions, saveToHistory = true } = options

  const { identity } = await getCareerIdentity(userId)

  const prompt = buildResumeBulletsPrompt({
    identity,
    experienceItems,
    targetRole,
    customInstructions,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.7,
    maxTokens: 2048,
  })

  const bullets = parseArrayResponse<{
    bullet: string
    category: string
    strength: string
    characterCount: number
  }>(response.text)

  let generationId: string | undefined
  if (saveToHistory && bullets.length > 0) {
    const content = bullets.map(b => `• ${b.bullet}`).join('\n')
    const newContent: NewGeneratedContent = {
      userId,
      contentType: 'resume',
      platform: 'resume',
      title: targetRole ? `Resume Bullets - ${targetRole}` : 'Resume Bullets',
      content,
      prompt,
      model: response.model,
      generationParams: {
        temperature: 0.7,
        customInstructions,
      } as GenerationParams,
    }

    const [saved] = await db.insert(generatedContent).values(newContent).returning()
    generationId = saved?.id
  }

  return {
    bullets,
    model: response.model,
    generationId,
  }
}

// ============================================
// Cover Letter Generation
// ============================================

export async function generateCoverLetter(
  userId: string,
  options: GenerateCoverLetterOptions
): Promise<CoverLetterResult> {
  const { targetRole, targetCompany, jobDescription, customInstructions, saveToHistory = true } = options

  const { identity } = await getCareerIdentity(userId)

  const prompt = buildCoverLetterPrompt({
    identity,
    targetRole,
    targetCompany,
    jobDescription,
    customInstructions,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.7,
    maxTokens: 3000,
  })

  const parsed = parseObjectResponse<{
    coverLetter: string
    keyPoints: string[]
    wordCount: number
  }>(response.text)

  let generationId: string | undefined
  if (saveToHistory && parsed.coverLetter) {
    const newContent: NewGeneratedContent = {
      userId,
      contentType: 'cover_letter',
      platform: 'email',
      title: `Cover Letter - ${targetRole} at ${targetCompany}`,
      content: parsed.coverLetter,
      prompt,
      model: response.model,
      generationParams: {
        temperature: 0.7,
        customInstructions,
      } as GenerationParams,
    }

    const [saved] = await db.insert(generatedContent).values(newContent).returning()
    generationId = saved?.id
  }

  return {
    coverLetter: parsed.coverLetter ?? '',
    keyPoints: parsed.keyPoints ?? [],
    wordCount: parsed.wordCount ?? countWords(parsed.coverLetter ?? ''),
    model: response.model,
    generationId,
  }
}

// ============================================
// LinkedIn Headline Generation
// ============================================

export async function generateLinkedInHeadline(
  userId: string,
  options: GenerateLinkedInOptions = {}
): Promise<LinkedInHeadlineResult> {
  const { targetAudience, keywords, customInstructions, saveToHistory = true } = options

  const { identity } = await getCareerIdentity(userId)

  const prompt = buildLinkedInHeadlinePrompt({
    identity,
    targetAudience,
    keywords,
    customInstructions,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.8,
    maxTokens: 1024,
  })

  const headlines = parseArrayResponse<{
    headline: string
    style: string
    searchTerms: string[]
    characterCount: number
  }>(response.text)

  let generationId: string | undefined
  if (saveToHistory && headlines.length > 0) {
    const best = headlines[0]
    if (best) {
      const newContent: NewGeneratedContent = {
        userId,
        contentType: 'linkedin_summary',
        platform: 'linkedin',
        title: 'LinkedIn Headline',
        content: best.headline,
        prompt,
        model: response.model,
        generationParams: {
          temperature: 0.8,
          customInstructions,
        } as GenerationParams,
      }

      const [saved] = await db.insert(generatedContent).values(newContent).returning()
      generationId = saved?.id
    }
  }

  return {
    headlines,
    model: response.model,
    generationId,
  }
}

// ============================================
// LinkedIn Summary Generation
// ============================================

export async function generateLinkedInSummary(
  userId: string,
  options: GenerateLinkedInOptions = {}
): Promise<LinkedInSummaryResult> {
  const { targetAudience, keywords, customInstructions, saveToHistory = true } = options

  const { identity } = await getCareerIdentity(userId)

  const prompt = buildLinkedInSummaryPrompt({
    identity,
    targetAudience,
    keywords,
    customInstructions,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.75,
    maxTokens: 3000,
  })

  const summaries = parseArrayResponse<{
    summary: string
    style: string
    keyThemes: string[]
    characterCount: number
  }>(response.text)

  let generationId: string | undefined
  if (saveToHistory && summaries.length > 0) {
    const best = summaries[0]
    if (best) {
      const newContent: NewGeneratedContent = {
        userId,
        contentType: 'linkedin_summary',
        platform: 'linkedin',
        title: 'LinkedIn Summary',
        content: best.summary,
        prompt,
        model: response.model,
        generationParams: {
          temperature: 0.75,
          customInstructions,
        } as GenerationParams,
      }

      const [saved] = await db.insert(generatedContent).values(newContent).returning()
      generationId = saved?.id
    }
  }

  return {
    summaries,
    model: response.model,
    generationId,
  }
}

// ============================================
// Elevator Pitch Generation
// ============================================

export async function generateElevatorPitch(
  userId: string,
  options: GenerateElevatorPitchOptions
): Promise<ElevatorPitchResult> {
  const { duration, context, customInstructions, saveToHistory = true } = options

  const { identity } = await getCareerIdentity(userId)

  const prompt = buildElevatorPitchPrompt({
    identity,
    duration,
    context,
    customInstructions,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.8,
    maxTokens: 2048,
  })

  const pitches = parseArrayResponse<{
    pitch: string
    style: string
    hook: string
    wordCount: number
  }>(response.text)

  let generationId: string | undefined
  if (saveToHistory && pitches.length > 0) {
    const best = pitches[0]
    if (best) {
      const newContent: NewGeneratedContent = {
        userId,
        contentType: 'bio',
        platform: 'elevator_pitch',
        title: `Elevator Pitch - ${duration === '30_seconds' ? '30s' : '60s'}`,
        content: best.pitch,
        prompt,
        model: response.model,
        generationParams: {
          temperature: 0.8,
          customInstructions,
        } as GenerationParams,
      }

      const [saved] = await db.insert(generatedContent).values(newContent).returning()
      generationId = saved?.id
    }
  }

  return {
    pitches,
    model: response.model,
    generationId,
  }
}

// ============================================
// Document Management
// ============================================

/**
 * List career documents for a user
 */
export async function listCareerDocuments(
  userId: string,
  options: {
    documentType?: CareerDocumentType
    limit?: number
    offset?: number
  } = {}
): Promise<{ documents: GeneratedContent[]; total: number }> {
  const { documentType, limit = 20, offset = 0 } = options

  const careerPlatforms = ['resume', 'linkedin', 'email', 'elevator_pitch']
  const careerTypes = ['resume', 'cover_letter', 'linkedin_summary', 'bio']

  let documents = await db
    .select()
    .from(generatedContent)
    .where(eq(generatedContent.userId, userId))
    .orderBy(desc(generatedContent.createdAt))
    .limit(limit + 50) // Get extra to filter
    .offset(offset)

  // Filter to career-related content
  documents = documents.filter(
    doc => careerPlatforms.includes(doc.platform ?? '') || careerTypes.includes(doc.contentType)
  )

  // Filter by document type if specified
  if (documentType) {
    const platformMap: Record<CareerDocumentType, { platform?: string; title?: string }> = {
      resume_summary: { platform: 'resume', title: 'Summary' },
      resume_bullets: { platform: 'resume', title: 'Bullets' },
      cover_letter: { platform: 'email' },
      linkedin_headline: { platform: 'linkedin', title: 'Headline' },
      linkedin_summary: { platform: 'linkedin', title: 'Summary' },
      elevator_pitch: { platform: 'elevator_pitch' },
    }

    const filter = platformMap[documentType]
    if (filter) {
      documents = documents.filter(doc => {
        const platformMatch = filter.platform ? doc.platform === filter.platform : true
        const titleMatch = filter.title ? doc.title?.includes(filter.title) : true
        return platformMatch && titleMatch
      })
    }
  }

  return {
    documents: documents.slice(0, limit),
    total: documents.length,
  }
}

/**
 * Get a specific career document
 */
export async function getCareerDocument(
  documentId: string,
  userId: string
): Promise<GeneratedContent | null> {
  const [doc] = await db
    .select()
    .from(generatedContent)
    .where(and(eq(generatedContent.id, documentId), eq(generatedContent.userId, userId)))
    .limit(1)

  return doc ?? null
}

/**
 * Delete a career document
 */
export async function deleteCareerDocument(documentId: string, userId: string): Promise<void> {
  const doc = await getCareerDocument(documentId, userId)
  if (!doc) {
    throw Errors.notFound('Document')
  }

  await db.delete(generatedContent).where(eq(generatedContent.id, documentId))
}

/**
 * Update a career document
 */
export async function updateCareerDocument(
  documentId: string,
  userId: string,
  updates: { content?: string; title?: string }
): Promise<GeneratedContent> {
  const doc = await getCareerDocument(documentId, userId)
  if (!doc) {
    throw Errors.notFound('Document')
  }

  const [updated] = await db
    .update(generatedContent)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(generatedContent.id, documentId))
    .returning()

  return updated!
}

/**
 * Get document specifications
 */
export function getDocumentSpecs() {
  return Object.entries(DOCUMENT_SPECS).map(([key, spec]) => ({
    id: key,
    ...spec,
  }))
}

// ============================================
// Helpers
// ============================================

function parseArrayResponse<T>(text: string): T[] {
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
    return Array.isArray(parsed) ? parsed : []
  } catch {
    console.error('Failed to parse array response')
    return []
  }
}

function parseObjectResponse<T>(text: string): Partial<T> {
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

    return JSON.parse(cleanText)
  } catch {
    console.error('Failed to parse object response')
    return {}
  }
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// Re-export types
export { DOCUMENT_SPECS, type CareerDocumentType } from './prompts'
