/**
 * Embedding Service
 *
 * Generates text embeddings using OpenAI's text-embedding-3-small model.
 * Used for identity vectors, content embeddings, and similarity search.
 */

import OpenAI from 'openai'
import { env } from '@/config/env'
import { Errors } from '@/utils/errors'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
})

// Model configuration
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

export interface EmbeddingResult {
  embedding: number[]
  model: string
  usage: {
    promptTokens: number
    totalTokens: number
  }
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!text || text.trim().length === 0) {
    throw Errors.validation('Text is required for embedding generation')
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim(),
      dimensions: EMBEDDING_DIMENSIONS,
    })

    const embedding = response.data[0]?.embedding
    if (!embedding) {
      throw Errors.internal('No embedding returned from OpenAI')
    }

    return {
      embedding,
      model: EMBEDDING_MODEL,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        totalTokens: response.usage.total_tokens,
      },
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') {
      throw error
    }

    // Handle OpenAI specific errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        throw Errors.internal('Invalid OpenAI API key')
      }
      if (error.status === 429) {
        throw Errors.rateLimited('OpenAI rate limit exceeded')
      }
      throw Errors.internal(`OpenAI API error: ${error.message}`)
    }

    throw Errors.internal('Failed to generate embedding')
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateBatchEmbeddings(
  texts: string[]
): Promise<{ embeddings: number[][]; usage: { promptTokens: number; totalTokens: number } }> {
  if (!texts.length) {
    throw Errors.validation('At least one text is required')
  }

  const validTexts = texts.map((t) => t.trim()).filter((t) => t.length > 0)
  if (validTexts.length === 0) {
    throw Errors.validation('At least one non-empty text is required')
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: validTexts,
      dimensions: EMBEDDING_DIMENSIONS,
    })

    const embeddings = response.data.map((d) => d.embedding)

    return {
      embeddings,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        totalTokens: response.usage.total_tokens,
      },
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') {
      throw error
    }

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        throw Errors.internal('Invalid OpenAI API key')
      }
      if (error.status === 429) {
        throw Errors.rateLimited('OpenAI rate limit exceeded')
      }
      throw Errors.internal(`OpenAI API error: ${error.message}`)
    }

    throw Errors.internal('Failed to generate batch embeddings')
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw Errors.validation('Embeddings must have the same dimensions')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0
    const bVal = b[i] ?? 0
    dotProduct += aVal * bVal
    normA += aVal * aVal
    normB += bVal * bVal
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  if (magnitude === 0) return 0

  return dotProduct / magnitude
}

/**
 * Blend two embeddings with given weights
 * Used for creating hybrid identity embeddings (80% unified + 20% context)
 */
export function blendEmbeddings(
  primary: number[],
  secondary: number[],
  primaryWeight = 0.8
): number[] {
  if (primary.length !== secondary.length) {
    throw Errors.validation('Embeddings must have the same dimensions')
  }

  const secondaryWeight = 1 - primaryWeight
  const blended: number[] = []

  for (let i = 0; i < primary.length; i++) {
    const p = primary[i]
    const s = secondary[i]
    if (p !== undefined && s !== undefined) {
      blended.push(p * primaryWeight + s * secondaryWeight)
    }
  }

  // Normalize the blended embedding
  const norm = Math.sqrt(blended.reduce((sum, val) => sum + val * val, 0))
  if (norm > 0) {
    for (let i = 0; i < blended.length; i++) {
      const val = blended[i]
      if (val !== undefined) {
        blended[i] = val / norm
      }
    }
  }

  return blended
}

// Export constants
export const EMBEDDING_CONFIG = {
  model: EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIMENSIONS,
}
