/**
 * Photo Storage Service
 *
 * Handles photo upload, storage, and retrieval using Supabase Storage.
 */

import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import { env } from '@/config/env'
import { Errors } from '@/utils/errors'

// Initialize Supabase client with service role for storage operations
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Configuration
const STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const SIGNED_URL_EXPIRY = 3600 // 1 hour

export interface UploadResult {
  storagePath: string
  publicUrl: string
  thumbnailPath?: string
  thumbnailUrl?: string
  metadata: {
    originalFilename: string
    mimeType: string
    fileSize: number
    width?: number
    height?: number
  }
}

export interface StorageError {
  code: string
  message: string
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: Buffer,
  mimeType: string,
  originalFilename: string
): { valid: boolean; error?: string } {
  // Check file size
  if (file.length > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
    }
  }

  // Check mime type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }
  }

  // Check file extension
  const ext = originalFilename.split('.').pop()?.toLowerCase()
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
  if (!ext || !validExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${validExtensions.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Generate a unique storage path for a photo
 */
function generateStoragePath(userId: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
  const uniqueId = nanoid(12)
  const timestamp = Date.now()
  return `${userId}/${timestamp}-${uniqueId}.${ext}`
}

/**
 * Upload a photo to Supabase Storage
 */
export async function uploadPhoto(
  userId: string,
  fileData: Buffer,
  mimeType: string,
  originalFilename: string
): Promise<UploadResult> {
  // Validate file
  const validation = validateFile(fileData, mimeType, originalFilename)
  if (!validation.valid) {
    throw Errors.validation(validation.error ?? 'Invalid file')
  }

  // Generate storage path
  const storagePath = generateStoragePath(userId, originalFilename)

  try {
    // Upload to Supabase Storage
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, fileData, {
      contentType: mimeType,
      upsert: false,
    })

    if (error) {
      console.error('Storage upload error:', error)
      throw Errors.internal(`Failed to upload photo: ${error.message}`)
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath)

    return {
      storagePath,
      publicUrl,
      metadata: {
        originalFilename,
        mimeType,
        fileSize: fileData.length,
      },
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') {
      throw error
    }
    console.error('Upload error:', error)
    throw Errors.internal('Failed to upload photo')
  }
}

/**
 * Upload an enhanced/optimized version of a photo
 */
export async function uploadEnhancedPhoto(
  userId: string,
  photoId: string,
  imageData: Buffer,
  mimeType = 'image/png'
): Promise<{ storagePath: string; publicUrl: string }> {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg'
  const storagePath = `${userId}/enhanced/${photoId}-${nanoid(6)}.${ext}`

  try {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, imageData, {
      contentType: mimeType,
      upsert: true,
    })

    if (error) {
      throw Errors.internal(`Failed to upload enhanced photo: ${error.message}`)
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath)

    return { storagePath, publicUrl }
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') {
      throw error
    }
    throw Errors.internal('Failed to upload enhanced photo')
  }
}

/**
 * Get a signed URL for a photo (for private buckets)
 */
export async function getSignedUrl(storagePath: string, expiresIn = SIGNED_URL_EXPIRY): Promise<string> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(storagePath, expiresIn)

  if (error) {
    throw Errors.internal(`Failed to get signed URL: ${error.message}`)
  }

  return data.signedUrl
}

/**
 * Download a photo from storage
 */
export async function downloadPhoto(storagePath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(storagePath)

  if (error) {
    throw Errors.notFound('Photo', `Photo not found: ${error.message}`)
  }

  // Convert Blob to Buffer
  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Delete a photo from storage
 */
export async function deletePhoto(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])

  if (error) {
    console.error('Delete error:', error)
    throw Errors.internal(`Failed to delete photo: ${error.message}`)
  }
}

/**
 * Delete multiple photos from storage
 */
export async function deletePhotos(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(storagePaths)

  if (error) {
    console.error('Bulk delete error:', error)
    throw Errors.internal(`Failed to delete photos: ${error.message}`)
  }
}

/**
 * List all photos for a user
 */
export async function listUserPhotos(userId: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(userId, {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' },
  })

  if (error) {
    throw Errors.internal(`Failed to list photos: ${error.message}`)
  }

  return data.map((file) => `${userId}/${file.name}`)
}

/**
 * Check if bucket exists and is configured
 */
export async function checkBucketHealth(): Promise<boolean> {
  try {
    const { error } = await supabase.storage.getBucket(STORAGE_BUCKET)
    return !error
  } catch {
    return false
  }
}

/**
 * Extract storage path from a public/enhanced URL
 * URL format: https://supabase.../storage/v1/object/public/photos/{path}
 */
export function extractStoragePathFromUrl(url: string): string | null {
  const match = url.match(/\/photos\/(.+)$/)
  return match?.[1] ?? null
}

/**
 * Get signed URLs for a photo (original and optionally enhanced)
 * Returns an object with signedOriginalUrl and optionally signedEnhancedUrl
 */
export async function getPhotoSignedUrls(
  storagePath: string,
  enhancedUrl: string | null,
  expiresIn = SIGNED_URL_EXPIRY
): Promise<{ signedOriginalUrl: string; signedEnhancedUrl: string | null }> {
  const signedOriginalUrl = await getSignedUrl(storagePath, expiresIn)

  let signedEnhancedUrl: string | null = null
  if (enhancedUrl) {
    const enhancedPath = extractStoragePathFromUrl(enhancedUrl)
    if (enhancedPath) {
      try {
        signedEnhancedUrl = await getSignedUrl(enhancedPath, expiresIn)
      } catch {
        // If enhanced URL fails, just return null
        console.warn('Failed to get signed URL for enhanced photo')
      }
    }
  }

  return { signedOriginalUrl, signedEnhancedUrl }
}

// Export configuration for reference
export const STORAGE_CONFIG = {
  bucket: STORAGE_BUCKET,
  maxFileSize: MAX_FILE_SIZE,
  allowedMimeTypes: ALLOWED_MIME_TYPES,
  signedUrlExpiry: SIGNED_URL_EXPIRY,
}
