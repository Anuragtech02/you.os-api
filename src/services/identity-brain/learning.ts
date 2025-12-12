/**
 * Learning Engine
 *
 * Processes user feedback and updates the identity brain's learning state.
 * Implements time-decay weighting for feedback history.
 */

import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  type FeedbackEntry,
  type LearningState,
  type IdentityBrain,
  identityBrains,
} from '@/db/schema'
import { Errors } from '@/utils/errors'

// Configuration
const DEFAULT_DECAY_FACTOR = 0.95 // Per-day decay
const MAX_FEEDBACK_HISTORY = 100

/**
 * Calculate time-decay weight for a feedback entry
 */
export function calculateDecayWeight(timestamp: string, decayFactor = DEFAULT_DECAY_FACTOR): number {
  const entryDate = new Date(timestamp)
  const now = new Date()
  const daysDiff = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))

  return Math.pow(decayFactor, daysDiff)
}

/**
 * Extract patterns from content for learning
 */
export function extractContentPatterns(content: string): {
  tone: string[]
  length: 'short' | 'medium' | 'long'
  keywords: string[]
} {
  // Determine length category
  const wordCount = content.split(/\s+/).length
  let length: 'short' | 'medium' | 'long'
  if (wordCount < 50) {
    length = 'short'
  } else if (wordCount < 200) {
    length = 'medium'
  } else {
    length = 'long'
  }

  // Extract potential tone markers
  const tone: string[] = []
  const lowerContent = content.toLowerCase()

  // Simple heuristic-based tone detection
  if (/\!/.test(content)) tone.push('enthusiastic')
  if (/\?/.test(content)) tone.push('inquisitive')
  if (/please|thank|appreciate/i.test(content)) tone.push('polite')
  if (/i think|i feel|i believe/i.test(content)) tone.push('personal')
  if (/we|our|together/i.test(content)) tone.push('inclusive')
  if (/however|although|but/i.test(content)) tone.push('nuanced')
  if (/must|should|need to/i.test(content)) tone.push('assertive')
  if (/maybe|perhaps|might/i.test(content)) tone.push('tentative')

  // Extract potential keywords (simple approach - words > 5 chars, not common)
  const commonWords = new Set([
    'about', 'after', 'again', 'being', 'before', 'between', 'could', 'during',
    'every', 'first', 'found', 'great', 'have', 'here', 'just', 'know', 'like',
    'made', 'make', 'many', 'more', 'most', 'much', 'need', 'never', 'only',
    'other', 'over', 'people', 'said', 'same', 'should', 'some', 'still',
    'such', 'than', 'that', 'their', 'them', 'then', 'there', 'these', 'they',
    'thing', 'think', 'this', 'those', 'time', 'very', 'want', 'well', 'were',
    'what', 'when', 'where', 'which', 'while', 'will', 'with', 'would', 'your',
  ])

  const words = lowerContent.match(/\b[a-z]{5,}\b/g) || []
  const wordFreq = new Map<string, number>()

  for (const word of words) {
    if (!commonWords.has(word)) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    }
  }

  // Get top 5 keywords by frequency
  const keywords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)

  return { tone, length, keywords }
}

/**
 * Process a feedback entry and update learning state
 */
export async function processFeedback(
  identityBrainId: string,
  feedback: {
    contentId: string
    contentType: string
    rating: 'positive' | 'negative' | 'neutral'
    comment?: string
    content?: string // The actual content for pattern extraction
  }
): Promise<IdentityBrain> {
  // Get current identity brain
  const [brain] = await db
    .select()
    .from(identityBrains)
    .where(eq(identityBrains.id, identityBrainId))
    .limit(1)

  if (!brain) {
    throw Errors.notFound('Identity brain')
  }

  const currentLearning = brain.learningState as LearningState

  // Create feedback entry
  const feedbackEntry: FeedbackEntry = {
    contentId: feedback.contentId,
    contentType: feedback.contentType,
    rating: feedback.rating,
    comment: feedback.comment,
    timestamp: new Date().toISOString(),
    decayWeight: 1.0, // Fresh feedback has full weight
  }

  // Update feedback history
  const feedbackHistory = currentLearning.feedbackHistory || []
  feedbackHistory.unshift(feedbackEntry)

  // Trim to max history size
  if (feedbackHistory.length > MAX_FEEDBACK_HISTORY) {
    feedbackHistory.length = MAX_FEEDBACK_HISTORY
  }

  // Recalculate decay weights for all entries
  for (const entry of feedbackHistory) {
    entry.decayWeight = calculateDecayWeight(entry.timestamp)
  }

  // Update content patterns based on feedback
  const contentPatterns = currentLearning.contentPatterns || {
    preferredLength: undefined,
    preferredTone: [],
    avoidTopics: [],
    favoriteTopics: [],
  }

  // Extract patterns from content if provided
  if (feedback.content) {
    const patterns = extractContentPatterns(feedback.content)

    if (feedback.rating === 'positive') {
      // Learn from positive feedback
      if (patterns.tone.length) {
        const currentTones = new Set(contentPatterns.preferredTone || [])
        for (const tone of patterns.tone) {
          currentTones.add(tone)
        }
        contentPatterns.preferredTone = Array.from(currentTones).slice(0, 10)
      }

      // Add to favorite topics
      const currentFavorites = new Set(contentPatterns.favoriteTopics || [])
      for (const keyword of patterns.keywords) {
        currentFavorites.add(keyword)
      }
      contentPatterns.favoriteTopics = Array.from(currentFavorites).slice(0, 20)
    } else if (feedback.rating === 'negative') {
      // Learn from negative feedback - add to avoid topics
      const currentAvoid = new Set(contentPatterns.avoidTopics || [])
      for (const keyword of patterns.keywords) {
        currentAvoid.add(keyword)
      }
      contentPatterns.avoidTopics = Array.from(currentAvoid).slice(0, 20)
    }
  }

  // Update performance metrics
  const metrics = currentLearning.performanceMetrics || {
    totalGenerations: 0,
    positiveRatings: 0,
    negativeRatings: 0,
    averageScore: 0,
  }

  metrics.totalGenerations = (metrics.totalGenerations || 0) + 1
  if (feedback.rating === 'positive') {
    metrics.positiveRatings = (metrics.positiveRatings || 0) + 1
  } else if (feedback.rating === 'negative') {
    metrics.negativeRatings = (metrics.negativeRatings || 0) + 1
  }

  // Calculate weighted average score (positive = 1, neutral = 0.5, negative = 0)
  const posRatings = metrics.positiveRatings ?? 0
  const negRatings = metrics.negativeRatings ?? 0
  const totalRated = posRatings + negRatings
  if (totalRated > 0) {
    metrics.averageScore = posRatings / totalRated
  }

  // Build updated learning state
  const updatedLearning: LearningState = {
    ...currentLearning,
    feedbackHistory,
    contentPatterns,
    performanceMetrics: metrics,
    lastLearnedAt: new Date().toISOString(),
  }

  // Update identity brain (without creating version for learning updates)
  const [updated] = await db
    .update(identityBrains)
    .set({
      learningState: updatedLearning,
      updatedAt: new Date(),
    })
    .where(eq(identityBrains.id, identityBrainId))
    .returning()

  if (!updated) {
    throw Errors.internal('Failed to update learning state')
  }

  return updated
}

/**
 * Get learning insights from feedback history
 */
export async function getLearningInsights(identityBrainId: string): Promise<{
  totalFeedback: number
  positiveRate: number
  preferredTones: string[]
  favoriteTopics: string[]
  avoidTopics: string[]
  recentTrend: 'improving' | 'declining' | 'stable'
}> {
  const [brain] = await db
    .select()
    .from(identityBrains)
    .where(eq(identityBrains.id, identityBrainId))
    .limit(1)

  if (!brain) {
    throw Errors.notFound('Identity brain')
  }

  const learning = brain.learningState as LearningState
  const metrics = learning.performanceMetrics || {}
  const patterns = learning.contentPatterns || {}
  const history = learning.feedbackHistory || []

  // Calculate recent trend (last 10 vs previous 10 feedback)
  let recentTrend: 'improving' | 'declining' | 'stable' = 'stable'
  if (history.length >= 10) {
    const recent = history.slice(0, 10)
    const previous = history.slice(10, 20)

    const recentPositive = recent.filter((f) => f.rating === 'positive').length
    const previousPositive = previous.filter((f) => f.rating === 'positive').length

    if (previous.length >= 5) {
      const recentRate = recentPositive / recent.length
      const previousRate = previousPositive / previous.length

      if (recentRate > previousRate + 0.1) {
        recentTrend = 'improving'
      } else if (recentRate < previousRate - 0.1) {
        recentTrend = 'declining'
      }
    }
  }

  const positiveCount = metrics.positiveRatings ?? 0
  const negativeCount = metrics.negativeRatings ?? 0
  const totalRated = positiveCount + negativeCount

  return {
    totalFeedback: history.length,
    positiveRate: totalRated > 0 ? positiveCount / totalRated : 0,
    preferredTones: patterns.preferredTone || [],
    favoriteTopics: patterns.favoriteTopics || [],
    avoidTopics: patterns.avoidTopics || [],
    recentTrend,
  }
}

/**
 * Clear learning history (reset to defaults)
 */
export async function clearLearningHistory(identityBrainId: string): Promise<IdentityBrain> {
  const [brain] = await db
    .select()
    .from(identityBrains)
    .where(eq(identityBrains.id, identityBrainId))
    .limit(1)

  if (!brain) {
    throw Errors.notFound('Identity brain')
  }

  const resetLearning: LearningState = {
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

  const [updated] = await db
    .update(identityBrains)
    .set({
      learningState: resetLearning,
      updatedAt: new Date(),
    })
    .where(eq(identityBrains.id, identityBrainId))
    .returning()

  if (!updated) {
    throw Errors.internal('Failed to clear learning history')
  }

  return updated
}
