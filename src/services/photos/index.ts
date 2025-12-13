/**
 * Photo Engine Service
 *
 * Main service for photo management, analysis, optimization, and ranking.
 * Combines storage, AI analysis, and database operations.
 */

import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  type EnhancementDetails,
  type NewPhoto,
  type Photo,
  type PhotoAnalysis,
  type PhotoMetadata,
  type PhotoScores,
  photos,
} from '@/db/schema'
import { Errors } from '@/utils/errors'
import * as GeminiService from '../ai/gemini'
import * as StorageService from './storage'

// ============================================
// Photo CRUD Operations
// ============================================

/**
 * Create a new photo record
 */
export async function createPhoto(data: {
  userId: string
  fileData: Buffer
  mimeType: string
  originalFilename: string
  uploadedFrom?: 'web' | 'mobile' | 'api'
}): Promise<Photo> {
  const { userId, fileData, mimeType, originalFilename, uploadedFrom = 'web' } = data

  // Upload to storage
  const uploadResult = await StorageService.uploadPhoto(userId, fileData, mimeType, originalFilename)

  // Create database record
  const newPhoto: NewPhoto = {
    userId,
    originalUrl: uploadResult.publicUrl,
    storagePath: uploadResult.storagePath,
    status: 'pending',
    metadata: {
      originalFilename,
      mimeType,
      fileSize: fileData.length,
      uploadedFrom,
    } as PhotoMetadata,
  }

  const [photo] = await db.insert(photos).values(newPhoto).returning()

  if (!photo) {
    throw Errors.internal('Failed to create photo record')
  }

  return photo
}

/**
 * Get a photo by ID
 */
export async function getById(photoId: string): Promise<Photo | null> {
  const [photo] = await db
    .select()
    .from(photos)
    .where(and(eq(photos.id, photoId), isNull(photos.deletedAt)))
    .limit(1)

  return photo ?? null
}

/**
 * Get a photo by ID for a specific user
 */
export async function getByIdForUser(photoId: string, userId: string): Promise<Photo | null> {
  const [photo] = await db
    .select()
    .from(photos)
    .where(and(eq(photos.id, photoId), eq(photos.userId, userId), isNull(photos.deletedAt)))
    .limit(1)

  return photo ?? null
}

/**
 * List photos for a user with pagination
 */
export async function listByUser(
  userId: string,
  options: {
    limit?: number
    offset?: number
    status?: string
    sortBy?: 'createdAt' | 'overallScore'
  } = {}
): Promise<{ photos: Photo[]; total: number }> {
  const { limit = 20, offset = 0, status, sortBy = 'createdAt' } = options

  const baseCondition = and(eq(photos.userId, userId), isNull(photos.deletedAt))
  const whereCondition = status
    ? and(baseCondition, eq(photos.status, status as Photo['status']))
    : baseCondition

  const [photoList, countResult] = await Promise.all([
    db
      .select()
      .from(photos)
      .where(whereCondition)
      .orderBy(sortBy === 'overallScore' ? desc(photos.overallScore) : desc(photos.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(photos)
      .where(whereCondition),
  ])

  return {
    photos: photoList,
    total: Number(countResult[0]?.count ?? 0),
  }
}

/**
 * Soft delete a photo
 */
export async function deletePhoto(photoId: string, userId: string): Promise<void> {
  const photo = await getByIdForUser(photoId, userId)
  if (!photo) {
    throw Errors.notFound('Photo')
  }

  // Soft delete in database
  await db
    .update(photos)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(photos.id, photoId))

  // Delete from storage (don't fail if storage delete fails)
  try {
    await StorageService.deletePhoto(photo.storagePath)
    if (photo.enhancedUrl) {
      // Extract enhanced path from URL and delete
      const enhancedPath = photo.storagePath.replace(/\.[^.]+$/, '-enhanced.png')
      await StorageService.deletePhoto(enhancedPath).catch(() => {})
    }
  } catch (error) {
    console.error('Failed to delete photo from storage:', error)
  }
}

/**
 * Set a photo as primary for the user
 */
export async function setPrimary(photoId: string, userId: string): Promise<Photo> {
  const photo = await getByIdForUser(photoId, userId)
  if (!photo) {
    throw Errors.notFound('Photo')
  }

  // Unset any existing primary photos
  await db
    .update(photos)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(and(eq(photos.userId, userId), eq(photos.isPrimary, true)))

  // Set this photo as primary
  const [updated] = await db
    .update(photos)
    .set({ isPrimary: true, updatedAt: new Date() })
    .where(eq(photos.id, photoId))
    .returning()

  if (!updated) {
    throw Errors.internal('Failed to update photo')
  }

  return updated
}

// ============================================
// Photo Analysis
// ============================================

/**
 * Analyze a photo using AI
 */
export async function analyzePhoto(photoId: string, userId: string): Promise<Photo> {
  const photo = await getByIdForUser(photoId, userId)
  if (!photo) {
    throw Errors.notFound('Photo')
  }

  // Update status to analyzing
  await db
    .update(photos)
    .set({ status: 'analyzing', updatedAt: new Date() })
    .where(eq(photos.id, photoId))

  try {
    // Download photo from storage
    const imageData = await StorageService.downloadPhoto(photo.storagePath)
    const mimeType = (photo.metadata as PhotoMetadata)?.mimeType ?? 'image/jpeg'

    // Analyze with Gemini
    const analysisResult = await GeminiService.analyzePhoto(imageData, mimeType)

    // Map analysis result to our schema
    const scores: PhotoScores = {
      technical: analysisResult.qualityScore,
      aesthetic: analysisResult.compositionScore,
      context: analysisResult.expressionScore,
      authenticity: analysisResult.skinQualityScore,
      weighted: analysisResult.overallScore,
    }

    const analysis: PhotoAnalysis = {
      faceDetected: analysisResult.faceDetected,
      faceCount: analysisResult.faceCount,
      facialExpression: analysisResult.facialExpression,
      eyeContact: analysisResult.eyeContact,
      composition: `Score: ${analysisResult.compositionScore}/100`,
      lighting: analysisResult.lighting,
      background: analysisResult.background,
      styleCategory: [analysisResult.detectedContext],
      colorDominant: analysisResult.colorDominant,
      mood: analysisResult.mood,
      issues: analysisResult.issues,
      suggestions: analysisResult.suggestions,
      bestFor: analysisResult.bestFor,
      rawAnalysis: analysisResult.rawAnalysis,
    }

    // Update photo with analysis results
    const [updated] = await db
      .update(photos)
      .set({
        status: 'analyzed',
        scores,
        overallScore: analysisResult.overallScore,
        analysis,
        analyzedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(photos.id, photoId))
      .returning()

    if (!updated) {
      throw Errors.internal('Failed to update photo with analysis')
    }

    return updated
  } catch (error) {
    // Update status to failed
    await db
      .update(photos)
      .set({
        status: 'failed',
        analysis: {
          issues: [error instanceof Error ? error.message : 'Analysis failed'],
        } as PhotoAnalysis,
        updatedAt: new Date(),
      })
      .where(eq(photos.id, photoId))

    throw error
  }
}

// ============================================
// Photo Optimization/Enhancement
// ============================================

/**
 * Enhance a photo using AI
 */
export async function enhancePhoto(
  photoId: string,
  userId: string,
  options: {
    enhanceLighting?: boolean
    enhanceColors?: boolean
    smoothSkin?: boolean
    improveBackground?: boolean
    customInstructions?: string
  } = {}
): Promise<Photo> {
  const photo = await getByIdForUser(photoId, userId)
  if (!photo) {
    throw Errors.notFound('Photo')
  }

  const startTime = Date.now()

  try {
    // Download original photo
    const imageData = await StorageService.downloadPhoto(photo.storagePath)
    const mimeType = (photo.metadata as PhotoMetadata)?.mimeType ?? 'image/jpeg'

    // Enhance with Gemini
    const enhanceResult = await GeminiService.enhancePhoto(imageData, {
      mimeType,
      ...options,
    })

    // Upload enhanced version
    const enhancedBuffer = Buffer.from(enhanceResult.imageBase64, 'base64')
    const { publicUrl: enhancedUrl } = await StorageService.uploadEnhancedPhoto(
      userId,
      photoId,
      enhancedBuffer,
      enhanceResult.mimeType
    )

    // Build enhancement details
    const operations: string[] = []
    if (options.enhanceLighting !== false) operations.push('lighting_enhancement')
    if (options.enhanceColors !== false) operations.push('color_correction')
    if (options.smoothSkin !== false) operations.push('skin_smoothing')
    if (options.improveBackground !== false) operations.push('background_improvement')

    const enhancementApplied: EnhancementDetails = {
      provider: 'gemini',
      operations,
      beforeScore: photo.overallScore ?? undefined,
      processingTimeMs: Date.now() - startTime,
    }

    // Update photo record
    const [updated] = await db
      .update(photos)
      .set({
        status: 'enhanced',
        enhancedUrl,
        enhancementApplied,
        updatedAt: new Date(),
      })
      .where(eq(photos.id, photoId))
      .returning()

    if (!updated) {
      throw Errors.internal('Failed to update photo with enhancement')
    }

    return updated
  } catch (error) {
    console.error('Enhancement error:', error)
    throw error instanceof Error && error.name === 'ApiError'
      ? error
      : Errors.internal('Failed to enhance photo')
  }
}

// ============================================
// Photo Ranking
// ============================================

export type PersonaContext = 'professional' | 'dating' | 'social' | 'private'

/**
 * Get ranked photos for a specific persona context
 */
export async function getRankedPhotos(
  userId: string,
  context: PersonaContext,
  limit = 10
): Promise<Photo[]> {
  // Get all analyzed photos
  const userPhotos = await db
    .select()
    .from(photos)
    .where(
      and(
        eq(photos.userId, userId),
        eq(photos.status, 'analyzed'),
        isNull(photos.deletedAt)
      )
    )
    .orderBy(desc(photos.overallScore))

  // Score photos based on context
  const scoredPhotos = userPhotos.map((photo) => {
    const analysis = photo.analysis as PhotoAnalysis
    const scores = photo.scores as PhotoScores
    let contextScore = photo.overallScore ?? 50

    // Adjust score based on context
    switch (context) {
      case 'professional':
        // Professional: Prioritize quality, expression, clean background
        if (analysis.bestFor?.includes('linkedin')) contextScore += 10
        if (analysis.background === 'clean') contextScore += 5
        if (analysis.facialExpression === 'serious' || analysis.facialExpression === 'neutral') contextScore += 5
        if (analysis.lighting === 'studio') contextScore += 5
        break

      case 'dating':
        // Dating: Prioritize expression, authenticity, approachability
        if (analysis.bestFor?.includes('dating') || analysis.bestFor?.includes('tinder')) contextScore += 10
        if (analysis.facialExpression === 'smiling' || analysis.facialExpression === 'playful') contextScore += 10
        if (analysis.eyeContact) contextScore += 5
        if (scores.authenticity && scores.authenticity > 70) contextScore += 5
        break

      case 'social':
        // Social: Prioritize aesthetic, mood, composition
        if (analysis.bestFor?.includes('instagram')) contextScore += 10
        if (analysis.mood === 'fun' || analysis.mood === 'warm') contextScore += 5
        if (scores.aesthetic && scores.aesthetic > 70) contextScore += 5
        break

      case 'private':
        // Private: Just use overall score
        break
    }

    return { photo, contextScore }
  })

  // Sort by context score and return top photos
  return scoredPhotos
    .sort((a, b) => b.contextScore - a.contextScore)
    .slice(0, limit)
    .map((p) => p.photo)
}

/**
 * Get the best photo for a context
 */
export async function getBestPhoto(userId: string, context: PersonaContext): Promise<Photo | null> {
  const ranked = await getRankedPhotos(userId, context, 1)
  return ranked[0] ?? null
}

// ============================================
// Batch Operations
// ============================================

/**
 * Analyze all pending photos for a user
 */
export async function analyzeAllPending(userId: string): Promise<{ analyzed: number; failed: number }> {
  const pendingPhotos = await db
    .select()
    .from(photos)
    .where(
      and(eq(photos.userId, userId), eq(photos.status, 'pending'), isNull(photos.deletedAt))
    )

  let analyzed = 0
  let failed = 0

  for (const photo of pendingPhotos) {
    try {
      await analyzePhoto(photo.id, userId)
      analyzed++
    } catch (error) {
      console.error(`Failed to analyze photo ${photo.id}:`, error)
      failed++
    }
  }

  return { analyzed, failed }
}

// Export sub-services
export * as Storage from './storage'
