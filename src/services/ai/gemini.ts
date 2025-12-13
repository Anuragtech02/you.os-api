/**
 * Gemini AI Service
 *
 * Provides image analysis and generation capabilities using Google's Gemini models.
 * - Image Analysis: gemini-2.5-flash
 * - Image Generation/Editing: gemini-2.5-flash-image (Nano Banana)
 */

import { GoogleGenAI } from '@google/genai'
import { env } from '@/config/env'
import { Errors } from '@/utils/errors'

// Initialize Google AI client
const ai = new GoogleGenAI({ apiKey: env.GOOGLE_AI_API_KEY })

// Model configuration
const ANALYSIS_MODEL = 'gemini-2.5-flash'
const IMAGE_MODEL = 'gemini-2.5-flash-image'

// Retry configuration
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES,
  initialDelay = INITIAL_RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const isRateLimit = lastError.message.includes('429') || lastError.message.includes('rate')
      const isRetryable = isRateLimit || lastError.message.includes('503')

      if (!isRetryable || attempt === maxRetries - 1) {
        throw lastError
      }

      const delay = initialDelay * Math.pow(2, attempt)
      await sleep(delay)
    }
  }
  throw lastError
}

// ============================================
// Image Analysis Types
// ============================================

export interface PhotoAnalysisResult {
  description: string
  qualityScore: number // 0-100
  lightingScore: number // 0-100
  compositionScore: number // 0-100
  expressionScore: number // 0-100
  backgroundScore: number // 0-100
  skinQualityScore: number // 0-100
  overallScore: number // 0-100 weighted average
  suggestions: string[]
  detectedContext: string // 'professional', 'casual', 'dating', etc.
  bestFor: string[] // ['linkedin', 'dating', 'instagram']
  issues: string[]
  faceDetected: boolean
  faceCount: number
  facialExpression: string
  eyeContact: boolean
  lighting: string
  background: string
  mood: string
  colorDominant: string[]
  rawAnalysis: string
}

export interface ImageGenerationResult {
  imageBase64: string
  mimeType: string
  model: string
  processingTimeMs: number
}

// ============================================
// Image Analysis
// ============================================

const PHOTO_ANALYSIS_PROMPT = `Analyze this photo in detail for use in personal branding and dating profiles.

Provide a JSON response with the following structure:
{
  "description": "Brief description of what's in the photo",
  "qualityScore": <0-100 overall technical quality>,
  "lightingScore": <0-100 lighting quality>,
  "compositionScore": <0-100 composition/framing>,
  "expressionScore": <0-100 facial expression naturalness and appeal>,
  "backgroundScore": <0-100 background appropriateness>,
  "skinQualityScore": <0-100 skin appearance quality>,
  "suggestions": ["suggestion 1", "suggestion 2", ...],
  "detectedContext": "<professional|casual|dating|social|formal>",
  "bestFor": ["linkedin", "tinder", "instagram", ...],
  "issues": ["issue 1", "issue 2", ...],
  "faceDetected": <true|false>,
  "faceCount": <number>,
  "facialExpression": "<smiling|neutral|serious|playful|...>",
  "eyeContact": <true|false>,
  "lighting": "<natural|studio|harsh|dim|...>",
  "background": "<clean|cluttered|outdoor|indoor|...>",
  "mood": "<warm|professional|fun|mysterious|...>",
  "colorDominant": ["color1", "color2", ...]
}

Be critical and honest in your assessment. Focus on:
1. Technical quality (focus, lighting, resolution)
2. Aesthetic appeal (composition, colors, mood)
3. Authenticity (natural vs over-processed)
4. Context appropriateness (professional vs casual)
5. Specific actionable improvements

Return ONLY valid JSON, no markdown code blocks.`

/**
 * Analyze a photo using Gemini 2.5 Flash
 */
export async function analyzePhoto(
  imageData: string | Buffer,
  mimeType = 'image/jpeg'
): Promise<PhotoAnalysisResult> {
  const base64Data = Buffer.isBuffer(imageData)
    ? imageData.toString('base64')
    : imageData

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        { text: PHOTO_ANALYSIS_PROMPT },
      ],
    })

    const text = response.text ?? ''

    // Parse JSON response
    try {
      // Clean the response - remove markdown code blocks if present
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

      // Calculate weighted overall score
      const overallScore = calculateOverallScore({
        qualityScore: parsed.qualityScore ?? 50,
        lightingScore: parsed.lightingScore ?? 50,
        compositionScore: parsed.compositionScore ?? 50,
        expressionScore: parsed.expressionScore ?? 50,
        backgroundScore: parsed.backgroundScore ?? 50,
        skinQualityScore: parsed.skinQualityScore ?? 50,
      })

      return {
        description: parsed.description ?? 'Photo analysis completed',
        qualityScore: parsed.qualityScore ?? 50,
        lightingScore: parsed.lightingScore ?? 50,
        compositionScore: parsed.compositionScore ?? 50,
        expressionScore: parsed.expressionScore ?? 50,
        backgroundScore: parsed.backgroundScore ?? 50,
        skinQualityScore: parsed.skinQualityScore ?? 50,
        overallScore,
        suggestions: parsed.suggestions ?? [],
        detectedContext: parsed.detectedContext ?? 'casual',
        bestFor: parsed.bestFor ?? [],
        issues: parsed.issues ?? [],
        faceDetected: parsed.faceDetected ?? false,
        faceCount: parsed.faceCount ?? 0,
        facialExpression: parsed.facialExpression ?? 'unknown',
        eyeContact: parsed.eyeContact ?? false,
        lighting: parsed.lighting ?? 'unknown',
        background: parsed.background ?? 'unknown',
        mood: parsed.mood ?? 'neutral',
        colorDominant: parsed.colorDominant ?? [],
        rawAnalysis: text,
      }
    } catch (parseError) {
      // If JSON parsing fails, return basic analysis
      console.error('Failed to parse Gemini response:', parseError)
      return {
        description: 'Photo analysis completed',
        qualityScore: 50,
        lightingScore: 50,
        compositionScore: 50,
        expressionScore: 50,
        backgroundScore: 50,
        skinQualityScore: 50,
        overallScore: 50,
        suggestions: ['Unable to provide specific suggestions'],
        detectedContext: 'unknown',
        bestFor: [],
        issues: ['Analysis parsing failed'],
        faceDetected: false,
        faceCount: 0,
        facialExpression: 'unknown',
        eyeContact: false,
        lighting: 'unknown',
        background: 'unknown',
        mood: 'unknown',
        colorDominant: [],
        rawAnalysis: text,
      }
    }
  })
}

/**
 * Calculate weighted overall score from individual scores
 */
function calculateOverallScore(scores: {
  qualityScore: number
  lightingScore: number
  compositionScore: number
  expressionScore: number
  backgroundScore: number
  skinQualityScore: number
}): number {
  // Weights for different aspects
  const weights = {
    qualityScore: 0.2,
    lightingScore: 0.15,
    compositionScore: 0.15,
    expressionScore: 0.25, // Expression is most important for portraits
    backgroundScore: 0.1,
    skinQualityScore: 0.15,
  }

  let weightedSum = 0
  let totalWeight = 0

  for (const [key, weight] of Object.entries(weights)) {
    const score = scores[key as keyof typeof scores]
    weightedSum += score * weight
    totalWeight += weight
  }

  return Math.round(weightedSum / totalWeight)
}

// ============================================
// Image Generation/Enhancement
// ============================================

const ENHANCEMENT_PROMPT_BASE = `Enhance this photo to professional studio quality while maintaining authenticity:
- Natural skin retouching (preserve texture, remove minor blemishes)
- Professional lighting adjustment
- Color grading for natural, flattering tones
- Background cleanup if needed
- Subtle sharpening for clarity

CRITICAL:
- DO NOT make it look AI-generated or overly processed
- Preserve the person's authentic appearance
- Output should match professional portrait photography quality
- Keep all facial features accurate and natural`

/**
 * Generate enhanced version of a photo
 */
export async function enhancePhoto(
  imageData: string | Buffer,
  options: {
    mimeType?: string
    enhanceLighting?: boolean
    enhanceColors?: boolean
    smoothSkin?: boolean
    improveBackground?: boolean
    customInstructions?: string
  } = {}
): Promise<ImageGenerationResult> {
  const {
    mimeType = 'image/jpeg',
    enhanceLighting = true,
    enhanceColors = true,
    smoothSkin = true,
    improveBackground = true,
    customInstructions,
  } = options

  const base64Data = Buffer.isBuffer(imageData)
    ? imageData.toString('base64')
    : imageData

  // Build enhancement prompt
  let prompt = ENHANCEMENT_PROMPT_BASE

  const enhancements: string[] = []
  if (enhanceLighting) enhancements.push('lighting enhancement')
  if (enhanceColors) enhancements.push('color correction')
  if (smoothSkin) enhancements.push('natural skin smoothing')
  if (improveBackground) enhancements.push('background improvement')

  if (enhancements.length > 0) {
    prompt += `\n\nFocus especially on: ${enhancements.join(', ')}.`
  }

  if (customInstructions) {
    prompt += `\n\nAdditional instructions: ${customInstructions}`
  }

  return withRetry(async () => {
    const startTime = Date.now()

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        { text: prompt },
      ],
    })

    const processingTime = Date.now() - startTime

    // Extract image from response
    const candidates = response.candidates
    if (!candidates || candidates.length === 0) {
      throw Errors.internal('No response from image generation model')
    }

    const parts = candidates[0]?.content?.parts
    if (!parts) {
      throw Errors.internal('No content parts in response')
    }

    // Find image part
    for (const part of parts) {
      if ('inlineData' in part && part.inlineData) {
        return {
          imageBase64: part.inlineData.data ?? '',
          mimeType: part.inlineData.mimeType ?? 'image/png',
          model: IMAGE_MODEL,
          processingTimeMs: processingTime,
        }
      }
    }

    throw Errors.internal('No image data in response')
  })
}

/**
 * Generate a new image from text prompt
 */
export async function generateImage(
  prompt: string,
  _options: {
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  } = {}
): Promise<ImageGenerationResult> {
  return withRetry(async () => {
    const startTime = Date.now()

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: prompt,
    })

    const processingTime = Date.now() - startTime
    void processingTime // May be used for logging

    // Extract image from response
    const candidates = response.candidates
    if (!candidates || candidates.length === 0) {
      throw Errors.internal('No response from image generation model')
    }

    const parts = candidates[0]?.content?.parts
    if (!parts) {
      throw Errors.internal('No content parts in response')
    }

    // Find image part
    for (const part of parts) {
      if ('inlineData' in part && part.inlineData) {
        return {
          imageBase64: part.inlineData.data ?? '',
          mimeType: part.inlineData.mimeType ?? 'image/png',
          model: IMAGE_MODEL,
          processingTimeMs: processingTime,
        }
      }
    }

    throw Errors.internal('No image data in response')
  })
}

// ============================================
// Text Generation (for Bio Generator)
// ============================================

export interface TextGenerationResult {
  text: string
  model: string
  tokensUsed?: number
}

/**
 * Generate text content using Gemini 2.5 Flash
 */
export async function generateText(
  prompt: string,
  options: {
    systemPrompt?: string
    temperature?: number
    maxTokens?: number
  } = {}
): Promise<TextGenerationResult> {
  const { systemPrompt, temperature = 0.7, maxTokens = 2048 } = options

  return withRetry(async () => {
    const contents = systemPrompt
      ? [{ text: `${systemPrompt}\n\n${prompt}` }]
      : prompt

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents,
      config: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    })

    return {
      text: response.text ?? '',
      model: ANALYSIS_MODEL,
    }
  })
}

// Export model names for reference
export const GEMINI_MODELS = {
  analysis: ANALYSIS_MODEL,
  image: IMAGE_MODEL,
}
