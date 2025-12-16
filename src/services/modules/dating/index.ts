/**
 * Dating Module Service
 *
 * Provides dating profile optimization, messaging assistance, and coaching.
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
  photos,
} from '@/db/schema'
import { Errors } from '@/utils/errors'
import * as GeminiService from '../../ai/gemini'
import {
  buildCoachingTasksPrompt,
  buildConversationAnalysisPrompt,
  buildDatingBioPrompt,
  buildDatingPhotoRankingPrompt,
  buildDatingPromptAnswerPrompt,
  buildMessageImprovePrompt,
  buildMessagingOpenerPrompt,
  buildMessagingReplyPrompt,
  type DatingIdentity,
  type DatingPlatform,
  HINGE_PROMPTS,
  PLATFORM_SPECS,
} from './prompts'

// ============================================
// Types
// ============================================

export interface DatingBioResult {
  bios: Array<{
    bio: string
    angle: string
    hooks: string[]
    characterCount: number
  }>
  platform: DatingPlatform
  model: string
  generationId?: string
}

export interface DatingPromptResult {
  answers: Array<{
    answer: string
    approach: string
    conversationStarter: string
    characterCount: number
  }>
  promptQuestion: string
  model: string
  generationId?: string
}

export interface MessagingOpenerResult {
  openers: Array<{
    message: string
    referencedDetail: string
    tone: string
    followUpPotential: string
  }>
  model: string
}

export interface MessagingReplyResult {
  replies: Array<{
    reply: string
    strategy: string
    tone: string
    nextTopicSuggestion: string
  }>
  model: string
}

export interface MessageImproveResult {
  improvedMessage: string
  changes: string[]
  analysis: {
    toneAssessment: string
    engagementLevel: string
    redFlags: string[]
    strengths: string[]
  }
  alternativeVersion: string
  model: string
}

export interface ConversationAnalysisResult {
  overallHealth: string
  interestLevel: {
    user: string
    match: string
    signals: string[]
  }
  whatWorking: string[]
  improvements: string[]
  suggestedNextMoves: Array<{
    move: string
    reason: string
  }>
  conversationDirection: string
  askForDateReady: boolean
  askForDateSuggestion?: string
  model: string
}

export interface CoachingTaskResult {
  tasks: Array<{
    task: string
    category: string
    priority: string
    estimatedMinutes: number
    reason: string
    tips: string[]
  }>
  model: string
}

export interface PhotoRankingResult {
  ranking: Array<{
    photoId: string
    rank: number
    suggestedPosition: string
    reason: string
    datingAppeal: number
  }>
  suggestedOrder: string[]
  missingTypes: string[]
  overallAssessment: string
  model: string
}

export interface GenerateDatingBioOptions {
  platform: DatingPlatform
  customInstructions?: string
  variations?: number
  saveToHistory?: boolean
}

export interface GenerateDatingPromptOptions {
  platform: DatingPlatform
  promptQuestion: string
  customInstructions?: string
  saveToHistory?: boolean
}

export interface GenerateMessagingOpenerOptions {
  matchBio?: string
  matchPhotosDescription?: string
  matchPrompts?: Array<{ question: string; answer: string }>
  tone?: 'playful' | 'witty' | 'sincere' | 'confident' | 'casual'
}

export interface GenerateMessagingReplyOptions {
  conversationHistory: Array<{ sender: 'user' | 'match'; message: string }>
  matchBio?: string
  tone?: 'playful' | 'witty' | 'sincere' | 'confident' | 'casual'
}

export interface ImproveMessageOptions {
  draftMessage: string
  context?: string
}

export interface AnalyzeConversationOptions {
  conversationHistory: Array<{ sender: 'user' | 'match'; message: string }>
  matchBio?: string
}

export interface GenerateCoachingTasksOptions {
  currentProfileScore?: number
  completedTasks?: string[]
  focusArea?: 'profile' | 'photos' | 'conversation' | 'confidence' | 'general'
}

// ============================================
// Helper: Build Dating Identity from Brain
// ============================================

async function getDatingIdentity(userId: string): Promise<{ identity: DatingIdentity; brainId: string }> {
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

  // Extract dating-related info from coreAttributes
  const identity: DatingIdentity = {
    name: coreAttributes.name,
    age: coreAttributes.age,
    occupation: coreAttributes.occupation,
    interests: coreAttributes.interests,
    personality: coreAttributes.personality,
    values: coreAttributes.values,
    quirks: coreAttributes.quirks,
    communicationStyle: coreAttributes.communicationStyle,
    lookingFor: coreAttributes.lookingFor as string | undefined,
  }

  return { identity, brainId: brain.id }
}

// ============================================
// Bio Generation
// ============================================

export async function generateDatingBio(
  userId: string,
  options: GenerateDatingBioOptions
): Promise<DatingBioResult> {
  const { platform, customInstructions, variations = 3, saveToHistory = true } = options

  if (!PLATFORM_SPECS[platform]) {
    throw Errors.validation(`Invalid platform: ${platform}`)
  }

  const { identity } = await getDatingIdentity(userId)

  const prompt = buildDatingBioPrompt({
    identity,
    platform,
    customInstructions,
    variations,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.85,
    maxTokens: 2048,
  })

  const bios = parseArrayResponse<{
    bio: string
    angle: string
    hooks: string[]
    characterCount: number
  }>(response.text)

  let generationId: string | undefined
  if (saveToHistory && bios.length > 0) {
    const best = bios[0]
    if (best) {
      const newContent: NewGeneratedContent = {
        userId,
        contentType: 'dating_profile',
        platform,
        title: `${PLATFORM_SPECS[platform].name} Bio`,
        content: best.bio,
        prompt,
        model: response.model,
        generationParams: {
          temperature: 0.85,
          customInstructions,
        } as GenerationParams,
      }

      const [saved] = await db.insert(generatedContent).values(newContent).returning()
      generationId = saved?.id
    }
  }

  return {
    bios,
    platform,
    model: response.model,
    generationId,
  }
}

// ============================================
// Prompt Answer Generation
// ============================================

export async function generateDatingPrompt(
  userId: string,
  options: GenerateDatingPromptOptions
): Promise<DatingPromptResult> {
  const { platform, promptQuestion, customInstructions, saveToHistory = true } = options

  if (!PLATFORM_SPECS[platform]) {
    throw Errors.validation(`Invalid platform: ${platform}`)
  }

  const { identity } = await getDatingIdentity(userId)

  const prompt = buildDatingPromptAnswerPrompt({
    identity,
    platform,
    promptQuestion,
    customInstructions,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.85,
    maxTokens: 1024,
  })

  const answers = parseArrayResponse<{
    answer: string
    approach: string
    conversationStarter: string
    characterCount: number
  }>(response.text)

  let generationId: string | undefined
  if (saveToHistory && answers.length > 0) {
    const best = answers[0]
    if (best) {
      const newContent: NewGeneratedContent = {
        userId,
        contentType: 'dating_prompt',
        platform,
        title: promptQuestion,
        content: best.answer,
        prompt,
        model: response.model,
        generationParams: {
          temperature: 0.85,
          customInstructions,
        } as GenerationParams,
      }

      const [saved] = await db.insert(generatedContent).values(newContent).returning()
      generationId = saved?.id
    }
  }

  return {
    answers,
    promptQuestion,
    model: response.model,
    generationId,
  }
}

// ============================================
// Messaging Assistance
// ============================================

export async function generateMessagingOpener(
  userId: string,
  options: GenerateMessagingOpenerOptions
): Promise<MessagingOpenerResult> {
  const { matchBio, matchPhotosDescription, matchPrompts, tone } = options

  const { identity } = await getDatingIdentity(userId)

  const prompt = buildMessagingOpenerPrompt({
    identity,
    matchBio,
    matchPhotosDescription,
    matchPrompts,
    tone,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.9,
    maxTokens: 1024,
  })

  const openers = parseArrayResponse<{
    message: string
    referencedDetail: string
    tone: string
    followUpPotential: string
  }>(response.text)

  return {
    openers,
    model: response.model,
  }
}

export async function generateMessagingReply(
  userId: string,
  options: GenerateMessagingReplyOptions
): Promise<MessagingReplyResult> {
  const { conversationHistory, matchBio, tone } = options

  if (!conversationHistory?.length) {
    throw Errors.validation('Conversation history is required')
  }

  const { identity } = await getDatingIdentity(userId)

  const prompt = buildMessagingReplyPrompt({
    identity,
    conversationHistory,
    matchBio,
    tone,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.85,
    maxTokens: 1024,
  })

  const replies = parseArrayResponse<{
    reply: string
    strategy: string
    tone: string
    nextTopicSuggestion: string
  }>(response.text)

  return {
    replies,
    model: response.model,
  }
}

export async function improveMessage(
  userId: string,
  options: ImproveMessageOptions
): Promise<MessageImproveResult> {
  const { draftMessage, context } = options

  if (!draftMessage?.trim()) {
    throw Errors.validation('Draft message is required')
  }

  const { identity } = await getDatingIdentity(userId)

  const prompt = buildMessageImprovePrompt({
    identity,
    draftMessage,
    context,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.7,
    maxTokens: 1024,
  })

  const result = parseObjectResponse<{
    improvedMessage: string
    changes: string[]
    analysis: {
      toneAssessment: string
      engagementLevel: string
      redFlags: string[]
      strengths: string[]
    }
    alternativeVersion: string
  }>(response.text)

  return {
    improvedMessage: result.improvedMessage ?? draftMessage,
    changes: result.changes ?? [],
    analysis: result.analysis ?? {
      toneAssessment: 'Unable to assess',
      engagementLevel: 'medium',
      redFlags: [],
      strengths: [],
    },
    alternativeVersion: result.alternativeVersion ?? '',
    model: response.model,
  }
}

export async function analyzeConversation(
  _userId: string,
  options: AnalyzeConversationOptions
): Promise<ConversationAnalysisResult> {
  const { conversationHistory, matchBio } = options

  if (!conversationHistory?.length) {
    throw Errors.validation('Conversation history is required')
  }

  const prompt = buildConversationAnalysisPrompt({
    conversationHistory,
    matchBio,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.6,
    maxTokens: 2048,
  })

  const result = parseObjectResponse<ConversationAnalysisResult>(response.text)

  return {
    overallHealth: result.overallHealth ?? 'neutral',
    interestLevel: result.interestLevel ?? {
      user: 'medium',
      match: 'medium',
      signals: [],
    },
    whatWorking: result.whatWorking ?? [],
    improvements: result.improvements ?? [],
    suggestedNextMoves: result.suggestedNextMoves ?? [],
    conversationDirection: result.conversationDirection ?? 'Unclear',
    askForDateReady: result.askForDateReady ?? false,
    askForDateSuggestion: result.askForDateSuggestion,
    model: response.model,
  }
}

// ============================================
// Coaching Tasks
// ============================================

export async function generateCoachingTasks(
  userId: string,
  options: GenerateCoachingTasksOptions = {}
): Promise<CoachingTaskResult> {
  const { currentProfileScore, completedTasks, focusArea } = options

  const { identity } = await getDatingIdentity(userId)

  const prompt = buildCoachingTasksPrompt({
    identity,
    currentProfileScore,
    completedTasks,
    focusArea,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.7,
    maxTokens: 2048,
  })

  const tasks = parseArrayResponse<{
    task: string
    category: string
    priority: string
    estimatedMinutes: number
    reason: string
    tips: string[]
  }>(response.text)

  return {
    tasks,
    model: response.model,
  }
}

// ============================================
// Photo Ranking for Dating
// ============================================

export async function rankPhotosForDating(userId: string): Promise<PhotoRankingResult> {
  // Get user's photos with analysis
  const userPhotos = await db
    .select()
    .from(photos)
    .where(eq(photos.userId, userId))
    .orderBy(desc(photos.createdAt))
    .limit(10)

  if (!userPhotos.length) {
    throw Errors.notFound('Photos', 'Please upload some photos first')
  }

  // Filter to photos that have been analyzed
  const analyzedPhotos = userPhotos.filter(p => p.analysis && Object.keys(p.analysis).length > 0)

  if (!analyzedPhotos.length) {
    throw Errors.validation('No analyzed photos found. Please analyze your photos first.')
  }

  // Build photo data for ranking
  const photoData = analyzedPhotos.map(p => {
    const analysis = p.analysis as Record<string, unknown>
    return {
      id: p.id,
      description: (analysis.description as string) || 'No description',
      scores: {
        qualityScore: (analysis.qualityScore as number) || 50,
        expressionScore: (analysis.expressionScore as number) || 50,
        lightingScore: (analysis.lightingScore as number) || 50,
      },
    }
  })

  const prompt = buildDatingPhotoRankingPrompt(photoData)

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.5,
    maxTokens: 2048,
  })

  const result = parseObjectResponse<{
    ranking: Array<{
      photoId: string
      rank: number
      suggestedPosition: string
      reason: string
      datingAppeal: number
    }>
    suggestedOrder: string[]
    missingTypes: string[]
    overallAssessment: string
  }>(response.text)

  return {
    ranking: result.ranking ?? [],
    suggestedOrder: result.suggestedOrder ?? [],
    missingTypes: result.missingTypes ?? [],
    overallAssessment: result.overallAssessment ?? 'Unable to assess',
    model: response.model,
  }
}

// ============================================
// Utilities
// ============================================

export function getSupportedPlatforms() {
  return Object.entries(PLATFORM_SPECS).map(([key, spec]) => ({
    id: key,
    ...spec,
  }))
}

export function getHingePrompts() {
  return HINGE_PROMPTS
}

/**
 * List dating-related generated content
 */
export async function listDatingContent(
  userId: string,
  options: {
    platform?: DatingPlatform
    limit?: number
    offset?: number
  } = {}
): Promise<{ content: GeneratedContent[]; total: number }> {
  const { platform, limit = 20, offset = 0 } = options

  const datingTypes = ['dating_profile', 'dating_prompt']
  const datingPlatforms = ['tinder', 'hinge', 'bumble', 'general']

  let content = await db
    .select()
    .from(generatedContent)
    .where(eq(generatedContent.userId, userId))
    .orderBy(desc(generatedContent.createdAt))
    .limit(limit + 50)
    .offset(offset)

  // Filter to dating content
  content = content.filter(
    c => datingTypes.includes(c.contentType) || datingPlatforms.includes(c.platform ?? '')
  )

  if (platform) {
    content = content.filter(c => c.platform === platform)
  }

  return {
    content: content.slice(0, limit),
    total: content.length,
  }
}

/**
 * Get a specific dating content item
 */
export async function getDatingContent(
  contentId: string,
  userId: string
): Promise<GeneratedContent | null> {
  const [content] = await db
    .select()
    .from(generatedContent)
    .where(and(eq(generatedContent.id, contentId), eq(generatedContent.userId, userId)))
    .limit(1)

  return content ?? null
}

/**
 * Delete dating content
 */
export async function deleteDatingContent(contentId: string, userId: string): Promise<void> {
  const content = await getDatingContent(contentId, userId)
  if (!content) {
    throw Errors.notFound('Content')
  }

  await db.delete(generatedContent).where(eq(generatedContent.id, contentId))
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

// Re-export types
export { PLATFORM_SPECS, HINGE_PROMPTS, type DatingPlatform } from './prompts'
