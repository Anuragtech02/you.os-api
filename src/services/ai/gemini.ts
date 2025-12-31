/**
 * Gemini AI Service
 *
 * Provides image analysis and generation capabilities using Google's Gemini models.
 * - Text/Analysis: gemini-3-flash-preview (latest)
 * - Image Generation/Editing: gemini-2.5-flash-image (Nano Banana)
 */

import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { env } from '@/config/env'
import { Errors } from '@/utils/errors'
import { logger } from '@/utils/logger'

// Initialize Google AI client
const ai = new GoogleGenAI({ apiKey: env.GOOGLE_AI_API_KEY })

// Initialize OpenAI client for fallback
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

// Model configuration
const ANALYSIS_MODEL = 'gemini-3-flash-preview'
const IMAGE_MODEL = 'gemini-2.5-flash-image'
const FALLBACK_MODEL = 'gpt-5-mini' // GPT-5 Mini fallback for rate limits

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
 * Generate text content using Gemini 2.5 Flash with GPT-5 Mini fallback
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

  // Try Gemini first
  try {
    return await withRetry(async () => {
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

      // Try to extract text, falling back to candidates if needed
      let text = response.text ?? ''
      if (!text && response.candidates && response.candidates.length > 0) {
        const parts = response.candidates[0]?.content?.parts
        if (parts && parts.length > 0) {
          for (const part of parts) {
            if ('text' in part && part.text) {
              text = part.text
              break
            }
          }
        }
      }

      return {
        text,
        model: ANALYSIS_MODEL,
      }
    })
  } catch (geminiError) {
    // Fallback to GPT-5 Mini if Gemini fails
    logger.warn('Gemini failed, falling back to GPT-5 Mini', { error: String(geminiError) })

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      }
      messages.push({ role: 'user', content: prompt })

      const response = await openai.chat.completions.create({
        model: FALLBACK_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
      })

      return {
        text: response.choices[0]?.message?.content ?? '',
        model: FALLBACK_MODEL,
        tokensUsed: response.usage?.total_tokens,
      }
    } catch (fallbackError) {
      logger.error('GPT-5 Mini fallback also failed', fallbackError)
      throw geminiError // Throw original error
    }
  }
}

// ============================================
// Voice Note Analysis (for Dating Module)
// ============================================

export interface VoiceNoteAnalysisResult {
  transcript: string
  toneAnalysis: {
    overall: string // 'confident', 'nervous', 'warm', 'monotone', etc.
    energy: string // 'high', 'medium', 'low'
    authenticity: string // 'genuine', 'rehearsed', 'natural'
  }
  pacing: {
    speed: string // 'fast', 'moderate', 'slow'
    pauseUsage: string // 'effective', 'too many', 'none'
    clarity: number // 0-100
  }
  content: {
    hookStrength: number // 0-100
    personalityShown: string[]
    improvements: string[]
    strengths: string[]
  }
  overallScore: number // 0-100
  suggestions: string[]
  model: string
}

const VOICE_NOTE_ANALYSIS_PROMPT = `Analyze this voice note/audio recording for a dating app profile.

Provide a JSON response with the following structure:
{
  "transcript": "Full transcript of what was said",
  "toneAnalysis": {
    "overall": "<confident|nervous|warm|monotone|enthusiastic|relaxed>",
    "energy": "<high|medium|low>",
    "authenticity": "<genuine|rehearsed|natural>"
  },
  "pacing": {
    "speed": "<fast|moderate|slow>",
    "pauseUsage": "<effective|too many|none>",
    "clarity": <0-100 how clear the speech is>
  },
  "content": {
    "hookStrength": <0-100 how engaging the opening is>,
    "personalityShown": ["trait1", "trait2", ...],
    "improvements": ["suggestion1", "suggestion2", ...],
    "strengths": ["strength1", "strength2", ...]
  },
  "overallScore": <0-100 overall effectiveness for dating>,
  "suggestions": ["actionable tip 1", "actionable tip 2", ...]
}

Focus on:
1. Voice quality and confidence level
2. How engaging and authentic they sound
3. Whether the content shows personality
4. Specific actionable improvements
5. What's working well

Return ONLY valid JSON, no markdown code blocks.`

/**
 * Analyze a voice note using Gemini 2.5 Flash (multimodal)
 */
export async function analyzeVoiceNote(
  audioData: string | Buffer,
  mimeType = 'audio/mp3'
): Promise<VoiceNoteAnalysisResult> {
  const base64Data = Buffer.isBuffer(audioData)
    ? audioData.toString('base64')
    : audioData

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
        { text: VOICE_NOTE_ANALYSIS_PROMPT },
      ],
    })

    const text = response.text ?? ''

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

      return {
        transcript: parsed.transcript ?? '',
        toneAnalysis: parsed.toneAnalysis ?? {
          overall: 'unknown',
          energy: 'medium',
          authenticity: 'unknown',
        },
        pacing: parsed.pacing ?? {
          speed: 'moderate',
          pauseUsage: 'unknown',
          clarity: 50,
        },
        content: parsed.content ?? {
          hookStrength: 50,
          personalityShown: [],
          improvements: [],
          strengths: [],
        },
        overallScore: parsed.overallScore ?? 50,
        suggestions: parsed.suggestions ?? [],
        model: ANALYSIS_MODEL,
      }
    } catch {
      return {
        transcript: '',
        toneAnalysis: {
          overall: 'unknown',
          energy: 'medium',
          authenticity: 'unknown',
        },
        pacing: {
          speed: 'moderate',
          pauseUsage: 'unknown',
          clarity: 50,
        },
        content: {
          hookStrength: 50,
          personalityShown: [],
          improvements: ['Unable to analyze audio'],
          strengths: [],
        },
        overallScore: 50,
        suggestions: ['Please try uploading a clearer audio file'],
        model: ANALYSIS_MODEL,
      }
    }
  })
}

// ============================================
// Photo Optimization (Identity-Preserving)
// ============================================

export interface PhotoOptimizationResult {
  imageBase64: string
  mimeType: string
  model: string
  processingTimeMs: number
  identityPreservation: number // 0-100 score
}

/**
 * Optimize a photo with a specific preset
 * This is the new identity-preserving optimization system
 */
export async function optimizePhotoWithPreset(
  imageData: string | Buffer,
  options: {
    mimeType?: string
    preset: 'professional' | 'attractive' | 'neutral'
    promptGuidance: string
  }
): Promise<PhotoOptimizationResult> {
  const { mimeType = 'image/jpeg', preset, promptGuidance } = options

  const base64Data = Buffer.isBuffer(imageData)
    ? imageData.toString('base64')
    : imageData

  const optimizationPrompt = `You are an identity-preserving photo optimization system.

PRESET: ${preset.toUpperCase()}

${promptGuidance}

ABSOLUTE RULES:
1. The person MUST remain immediately recognizable - this is NON-NEGOTIABLE
2. NO artificial filters, heavy beautification, or unrealistic skin smoothing
3. NO changing facial features, bone structure, or proportions
4. NO making the photo look AI-generated or over-processed
5. This is identity optimization, NOT photo editing - maintain authenticity
6. Output should look like a high-quality photograph, not digital art

The goal is to optimize for the ${preset} context while preserving the person's true appearance.
Make subtle, professional adjustments only.`

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
        { text: optimizationPrompt },
      ],
    })

    const processingTime = Date.now() - startTime

    // Extract image from response
    const candidates = response.candidates
    if (!candidates || candidates.length === 0) {
      throw Errors.internal('No response from optimization model')
    }

    const parts = candidates[0]?.content?.parts
    if (!parts) {
      throw Errors.internal('No content parts in response')
    }

    // Find image part
    for (const part of parts) {
      if ('inlineData' in part && part.inlineData) {
        // Estimate identity preservation based on preset
        // Neutral should have highest preservation, professional moderate, attractive moderate
        const identityPreservation = preset === 'neutral' ? 95 : preset === 'professional' ? 85 : 80

        return {
          imageBase64: part.inlineData.data ?? '',
          mimeType: part.inlineData.mimeType ?? 'image/png',
          model: IMAGE_MODEL,
          processingTimeMs: processingTime,
          identityPreservation,
        }
      }
    }

    throw Errors.internal('No image data in optimization response')
  })
}

// Export model names for reference
export const GEMINI_MODELS = {
  analysis: ANALYSIS_MODEL,
  image: IMAGE_MODEL,
  fallback: FALLBACK_MODEL,
}
