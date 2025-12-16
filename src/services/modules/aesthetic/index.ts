/**
 * Aesthetic Module Service
 *
 * Provides personal styling recommendations including color palettes,
 * styling guidance, hair, makeup, and wardrobe suggestions.
 */

import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  type AestheticState,
  type CoreAttributes,
  identityBrains,
  photos,
} from '@/db/schema'
import { Errors } from '@/utils/errors'
import * as GeminiService from '../../ai/gemini'
import {
  type AestheticIdentity,
  buildColorPalettePrompt,
  buildFullAestheticPrompt,
  buildHairPrompt,
  buildMakeupPrompt,
  buildStylingPrompt,
  buildWardrobePrompt,
  type ColorSeason,
  type PhotoAnalysisData,
  type StyleArchetype,
  type Undertone,
} from './prompts'

// ============================================
// Types
// ============================================

export interface ColorPaletteResult {
  season: ColorSeason
  undertone: Undertone
  analysis: string
  palette: {
    primary: Array<{ name: string; hex: string; usage: string }>
    secondary: Array<{ name: string; hex: string; usage: string }>
    accents: Array<{ name: string; hex: string; usage: string }>
    neutrals: Array<{ name: string; hex: string; usage: string }>
    avoid: Array<{ name: string; hex: string; reason: string }>
  }
  tips: string[]
  model: string
}

export interface StylingResult {
  currentStyle: string
  recommendedArchetype: StyleArchetype
  archetypeReason: string
  styleDirection: string
  styleRules: Array<{ rule: string; explanation: string }>
  dos: string[]
  donts: string[]
  keyPieces: Array<{ piece: string; reason: string }>
  signatureElements: string[]
  model: string
}

export interface HairResult {
  currentAssessment: string
  faceShapeAnalysis: string
  cutSuggestions: Array<{
    name: string
    description: string
    whyItWorks: string
    maintenance: string
    stylingRequired: string
  }>
  colorSuggestions: Array<{
    name: string
    description: string
    whyItWorks: string
    maintenance: string
  }>
  stylingTips: string[]
  productsRecommended: string[]
  avoid: string[]
  model: string
}

export interface MakeupResult {
  colorAnalysis: string
  looks: {
    everyday: MakeupLook
    professional: MakeupLook
    dateNight: MakeupLook
    special: MakeupLook
  }
  techniques: Array<{ technique: string; howTo: string; whyItHelps: string }>
  productRecommendations: Array<{ product: string; purpose: string; priority: string }>
  avoid: string[]
  model: string
}

interface MakeupLook {
  description: string
  steps: string[]
  keyProducts: string[]
  shadeRecommendations: {
    foundation: string
    blush: string
    lip: string
    eyeshadow: string
  }
  timeRequired: string
}

export interface WardrobeResult {
  currentWardrobeAssessment: string
  essentials: Array<{
    item: string
    description: string
    versatility: string
    priority: string
  }>
  outfitCombinations: Array<{
    name: string
    occasion: string
    pieces: string[]
    accessories: string[]
    photographsWell: boolean
  }>
  cameraReadyTips: {
    colorsThatPhotographWell: string[]
    patternsToAvoid: string[]
    texturesThatWork: string[]
    outfitIdeas: string[]
  }
  shoppingPriorities: Array<{
    item: string
    reason: string
    budgetTip: string
  }>
  avoid: string[]
  model: string
}

export interface FullAestheticResult {
  overallAesthetic: string
  colorSeason: ColorSeason
  styleArchetype: StyleArchetype
  keyStrengths: string[]
  focusAreas: string[]
  quickWins: string[]
  signature: string
  model: string
}

export interface GenerateColorPaletteOptions {
  customInstructions?: string
}

export interface GenerateStylingOptions {
  targetArchetype?: StyleArchetype
  occasion?: 'everyday' | 'professional' | 'dating' | 'special'
  customInstructions?: string
}

export interface GenerateHairOptions {
  currentHairstyle?: string
  maintenanceLevel?: 'low' | 'medium' | 'high'
  customInstructions?: string
}

export interface GenerateMakeupOptions {
  occasion?: 'everyday' | 'professional' | 'date' | 'special'
  skillLevel?: 'beginner' | 'intermediate' | 'advanced'
  customInstructions?: string
}

export interface GenerateWardrobeOptions {
  budget?: 'budget' | 'moderate' | 'luxury'
  targetOccasions?: string[]
  customInstructions?: string
}

// ============================================
// Helper: Build Aesthetic Identity from Brain
// ============================================

async function getAestheticIdentity(userId: string): Promise<{
  identity: AestheticIdentity
  brainId: string
  photoAnalysis?: PhotoAnalysisData
}> {
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

  const aestheticState = brain.aestheticState as Record<string, unknown> | null

  const identity: AestheticIdentity = {
    name: coreAttributes.name,
    gender: aestheticState?.gender as string | undefined,
    age: aestheticState?.age as number | undefined,
    occupation: coreAttributes.occupation,
    lifestyle: aestheticState?.lifestyle as string | undefined,
    preferences: {
      stylePreferences: aestheticState?.stylePreferences as string[] | undefined,
      colorPreferences: aestheticState?.colorPreferences as string[] | undefined,
      avoidStyles: aestheticState?.avoidStyles as string[] | undefined,
    },
  }

  // Try to get photo analysis data from user's photos
  const userPhotos = await db
    .select()
    .from(photos)
    .where(eq(photos.userId, userId))
    .orderBy(desc(photos.createdAt))
    .limit(5)

  let photoAnalysis: PhotoAnalysisData | undefined

  // Aggregate analysis from photos that have been analyzed
  const analyzedPhotos = userPhotos.filter(p => p.analysis && Object.keys(p.analysis).length > 0)
  if (analyzedPhotos.length > 0) {
    const analyses = analyzedPhotos.map(p => p.analysis as Record<string, unknown>)

    // Get most common values from analyses
    photoAnalysis = {
      skinTone: getMostCommon(analyses, 'skinTone'),
      hairColor: getMostCommon(analyses, 'hairColor'),
      eyeColor: getMostCommon(analyses, 'eyeColor'),
      faceShape: getMostCommon(analyses, 'faceShape'),
      currentStyle: getMostCommon(analyses, 'detectedContext'),
      colorDominant: flattenArrays(analyses, 'colorDominant'),
    }
  }

  return { identity, brainId: brain.id, photoAnalysis }
}

// ============================================
// Color Palette Generation
// ============================================

export async function generateColorPalette(
  userId: string,
  options: GenerateColorPaletteOptions = {}
): Promise<ColorPaletteResult> {
  const { customInstructions } = options

  const { identity, photoAnalysis } = await getAestheticIdentity(userId)

  const prompt = buildColorPalettePrompt({
    identity,
    photoAnalysis,
    customInstructions,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.6,
    maxTokens: 3000,
  })

  const result = parseObjectResponse<ColorPaletteResult>(response.text)

  return {
    season: result.season ?? 'autumn',
    undertone: result.undertone ?? 'neutral',
    analysis: result.analysis ?? 'Unable to analyze',
    palette: result.palette ?? {
      primary: [],
      secondary: [],
      accents: [],
      neutrals: [],
      avoid: [],
    },
    tips: result.tips ?? [],
    model: response.model,
  }
}

// ============================================
// Styling Guidance Generation
// ============================================

export async function generateStylingGuidance(
  userId: string,
  options: GenerateStylingOptions = {}
): Promise<StylingResult> {
  const { targetArchetype, occasion, customInstructions } = options

  const { identity, photoAnalysis } = await getAestheticIdentity(userId)

  const prompt = buildStylingPrompt({
    identity,
    photoAnalysis,
    targetArchetype,
    occasion,
    customInstructions,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.7,
    maxTokens: 3000,
  })

  const result = parseObjectResponse<StylingResult>(response.text)

  return {
    currentStyle: result.currentStyle ?? 'Unable to assess',
    recommendedArchetype: result.recommendedArchetype ?? 'modern',
    archetypeReason: result.archetypeReason ?? '',
    styleDirection: result.styleDirection ?? '',
    styleRules: result.styleRules ?? [],
    dos: result.dos ?? [],
    donts: result.donts ?? [],
    keyPieces: result.keyPieces ?? [],
    signatureElements: result.signatureElements ?? [],
    model: response.model,
  }
}

// ============================================
// Hair Suggestions Generation
// ============================================

export async function generateHairSuggestions(
  userId: string,
  options: GenerateHairOptions = {}
): Promise<HairResult> {
  const { currentHairstyle, maintenanceLevel, customInstructions } = options

  const { identity, photoAnalysis } = await getAestheticIdentity(userId)

  const prompt = buildHairPrompt({
    identity,
    photoAnalysis,
    currentHairstyle,
    maintenanceLevel,
    customInstructions,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.7,
    maxTokens: 3000,
  })

  const result = parseObjectResponse<HairResult>(response.text)

  return {
    currentAssessment: result.currentAssessment ?? 'Unable to assess',
    faceShapeAnalysis: result.faceShapeAnalysis ?? '',
    cutSuggestions: result.cutSuggestions ?? [],
    colorSuggestions: result.colorSuggestions ?? [],
    stylingTips: result.stylingTips ?? [],
    productsRecommended: result.productsRecommended ?? [],
    avoid: result.avoid ?? [],
    model: response.model,
  }
}

// ============================================
// Makeup Suggestions Generation
// ============================================

export async function generateMakeupSuggestions(
  userId: string,
  options: GenerateMakeupOptions = {}
): Promise<MakeupResult> {
  const { occasion, skillLevel, customInstructions } = options

  const { identity, photoAnalysis } = await getAestheticIdentity(userId)

  const prompt = buildMakeupPrompt({
    identity,
    photoAnalysis,
    occasion,
    skillLevel,
    customInstructions,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.7,
    maxTokens: 4000,
  })

  const result = parseObjectResponse<MakeupResult>(response.text)

  const defaultLook: MakeupLook = {
    description: '',
    steps: [],
    keyProducts: [],
    shadeRecommendations: {
      foundation: '',
      blush: '',
      lip: '',
      eyeshadow: '',
    },
    timeRequired: '',
  }

  return {
    colorAnalysis: result.colorAnalysis ?? 'Unable to analyze',
    looks: {
      everyday: result.looks?.everyday ?? defaultLook,
      professional: result.looks?.professional ?? defaultLook,
      dateNight: result.looks?.dateNight ?? defaultLook,
      special: result.looks?.special ?? defaultLook,
    },
    techniques: result.techniques ?? [],
    productRecommendations: result.productRecommendations ?? [],
    avoid: result.avoid ?? [],
    model: response.model,
  }
}

// ============================================
// Wardrobe Guidance Generation
// ============================================

export async function generateWardrobeGuidance(
  userId: string,
  options: GenerateWardrobeOptions = {}
): Promise<WardrobeResult> {
  const { budget, targetOccasions, customInstructions } = options

  const { identity, photoAnalysis } = await getAestheticIdentity(userId)

  const prompt = buildWardrobePrompt({
    identity,
    photoAnalysis,
    budget,
    targetOccasions,
    customInstructions,
  })

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.7,
    maxTokens: 4000,
  })

  const result = parseObjectResponse<WardrobeResult>(response.text)

  return {
    currentWardrobeAssessment: result.currentWardrobeAssessment ?? 'Unable to assess',
    essentials: result.essentials ?? [],
    outfitCombinations: result.outfitCombinations ?? [],
    cameraReadyTips: result.cameraReadyTips ?? {
      colorsThatPhotographWell: [],
      patternsToAvoid: [],
      texturesThatWork: [],
      outfitIdeas: [],
    },
    shoppingPriorities: result.shoppingPriorities ?? [],
    avoid: result.avoid ?? [],
    model: response.model,
  }
}

// ============================================
// Full Aesthetic Analysis
// ============================================

export async function analyzeFullAesthetic(userId: string): Promise<FullAestheticResult> {
  const { identity, photoAnalysis } = await getAestheticIdentity(userId)

  const prompt = buildFullAestheticPrompt(identity, photoAnalysis)

  const response = await GeminiService.generateText(prompt, {
    temperature: 0.6,
    maxTokens: 2000,
  })

  const result = parseObjectResponse<FullAestheticResult>(response.text)

  return {
    overallAesthetic: result.overallAesthetic ?? 'Unable to analyze',
    colorSeason: result.colorSeason ?? 'autumn',
    styleArchetype: result.styleArchetype ?? 'modern',
    keyStrengths: result.keyStrengths ?? [],
    focusAreas: result.focusAreas ?? [],
    quickWins: result.quickWins ?? [],
    signature: result.signature ?? '',
    model: response.model,
  }
}

// ============================================
// Update Aesthetic State
// ============================================

export async function updateAestheticPreferences(
  userId: string,
  preferences: {
    gender?: string
    age?: number
    lifestyle?: string
    stylePreferences?: string[]
    colorPreferences?: string[]
    avoidStyles?: string[]
  }
): Promise<void> {
  const [brain] = await db
    .select()
    .from(identityBrains)
    .where(eq(identityBrains.userId, userId))
    .limit(1)

  if (!brain) {
    throw Errors.notFound('Identity brain')
  }

  const currentState = (brain.aestheticState as AestheticState) ?? {}

  const newAestheticState: AestheticState = {
    ...currentState,
    // Store custom preferences in the aesthetic state structure
  }

  // These fields are custom extensions
  const extendedState = newAestheticState as AestheticState & Record<string, unknown>
  if (preferences.gender) extendedState.gender = preferences.gender
  if (preferences.age) extendedState.age = preferences.age
  if (preferences.lifestyle) extendedState.lifestyle = preferences.lifestyle
  if (preferences.stylePreferences) extendedState.stylePreferences = preferences.stylePreferences
  if (preferences.colorPreferences) extendedState.colorPreferences = preferences.colorPreferences
  if (preferences.avoidStyles) extendedState.avoidStyles = preferences.avoidStyles
  extendedState.lastAnalyzedAt = new Date().toISOString()

  await db
    .update(identityBrains)
    .set({
      aestheticState: newAestheticState,
      updatedAt: new Date(),
    })
    .where(eq(identityBrains.id, brain.id))
}

// ============================================
// Get Current Aesthetic Profile
// ============================================

export async function getAestheticProfile(userId: string): Promise<{
  preferences: Record<string, unknown>
  hasPhotoAnalysis: boolean
  photoCount: number
}> {
  const [brain] = await db
    .select()
    .from(identityBrains)
    .where(eq(identityBrains.userId, userId))
    .limit(1)

  if (!brain) {
    throw Errors.notFound('Identity brain')
  }

  const userPhotos = await db
    .select()
    .from(photos)
    .where(eq(photos.userId, userId))

  const analyzedPhotos = userPhotos.filter(p => p.analysis && Object.keys(p.analysis).length > 0)

  return {
    preferences: (brain.aestheticState as Record<string, unknown>) ?? {},
    hasPhotoAnalysis: analyzedPhotos.length > 0,
    photoCount: userPhotos.length,
  }
}

// ============================================
// Helpers
// ============================================

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

function getMostCommon(analyses: Record<string, unknown>[], key: string): string | undefined {
  const values = analyses.map(a => a[key] as string).filter(Boolean)
  if (values.length === 0) return undefined

  const counts: Record<string, number> = {}
  for (const val of values) {
    counts[val] = (counts[val] ?? 0) + 1
  }

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
}

function flattenArrays(analyses: Record<string, unknown>[], key: string): string[] {
  const allValues: string[] = []
  for (const analysis of analyses) {
    const arr = analysis[key] as string[] | undefined
    if (arr) {
      allValues.push(...arr)
    }
  }
  return [...new Set(allValues)]
}

// Re-export types
export { type ColorSeason, type StyleArchetype, type Undertone } from './prompts'
