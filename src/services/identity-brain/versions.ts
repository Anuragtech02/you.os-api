/**
 * Version Service
 *
 * Manages identity brain versions for rollback and manual snapshots.
 * Auto-versions are created on updates (keeps last 5).
 * Manual snapshots can be named and are kept indefinitely.
 */

import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  type IdentityBrain,
  type IdentityBrainVersion,
  identityBrains,
  identityBrainVersions,
} from '@/db/schema'
import { Errors } from '@/utils/errors'

const MAX_AUTO_VERSIONS = 5

/**
 * Create a version snapshot from current identity brain state
 */
export async function createVersion(
  brain: IdentityBrain,
  options?: { type?: 'auto' | 'manual'; snapshotName?: string }
): Promise<IdentityBrainVersion> {
  const type = options?.type ?? 'auto'

  const [version] = await db
    .insert(identityBrainVersions)
    .values({
      identityBrainId: brain.id,
      versionNumber: brain.currentVersion,
      versionType: type,
      snapshotName: options?.snapshotName,
      coreAttributes: brain.coreAttributes,
      aestheticState: brain.aestheticState,
      learningState: brain.learningState,
      identityEmbedding: brain.identityEmbedding,
      contentEmbedding: brain.contentEmbedding,
    })
    .returning()

  if (!version) {
    throw Errors.internal('Failed to create version')
  }

  // Clean up old auto versions if needed
  if (type === 'auto') {
    await cleanupOldAutoVersions(brain.id)
  }

  return version
}

/**
 * Create a manual snapshot with a name
 */
export async function createSnapshot(
  identityBrainId: string,
  snapshotName: string
): Promise<IdentityBrainVersion> {
  const [brain] = await db
    .select()
    .from(identityBrains)
    .where(eq(identityBrains.id, identityBrainId))
    .limit(1)

  if (!brain) {
    throw Errors.notFound('Identity brain')
  }

  return createVersion(brain, { type: 'manual', snapshotName })
}

/**
 * List all versions for an identity brain
 */
export async function list(
  identityBrainId: string,
  options?: { limit?: number; offset?: number }
): Promise<IdentityBrainVersion[]> {
  const limit = options?.limit ?? 20
  const offset = options?.offset ?? 0

  return db
    .select()
    .from(identityBrainVersions)
    .where(eq(identityBrainVersions.identityBrainId, identityBrainId))
    .orderBy(desc(identityBrainVersions.versionNumber))
    .limit(limit)
    .offset(offset)
}

/**
 * Get a specific version by version number
 */
export async function getByVersionNumber(
  identityBrainId: string,
  versionNumber: number
): Promise<IdentityBrainVersion | null> {
  const [version] = await db
    .select()
    .from(identityBrainVersions)
    .where(
      and(
        eq(identityBrainVersions.identityBrainId, identityBrainId),
        eq(identityBrainVersions.versionNumber, versionNumber)
      )
    )
    .limit(1)

  return version ?? null
}

/**
 * Get a version by ID
 */
export async function getById(id: string): Promise<IdentityBrainVersion | null> {
  const [version] = await db
    .select()
    .from(identityBrainVersions)
    .where(eq(identityBrainVersions.id, id))
    .limit(1)

  return version ?? null
}

/**
 * Rollback to a specific version
 */
export async function rollback(
  identityBrainId: string,
  versionNumber: number
): Promise<IdentityBrain> {
  // Get the version to rollback to
  const version = await getByVersionNumber(identityBrainId, versionNumber)
  if (!version) {
    throw Errors.notFound('Version')
  }

  // Get current brain state
  const [currentBrain] = await db
    .select()
    .from(identityBrains)
    .where(eq(identityBrains.id, identityBrainId))
    .limit(1)

  if (!currentBrain) {
    throw Errors.notFound('Identity brain')
  }

  // Create a version of current state before rollback
  await createVersion(currentBrain, { type: 'auto' })

  // Update identity brain with version data
  const [updated] = await db
    .update(identityBrains)
    .set({
      coreAttributes: version.coreAttributes,
      aestheticState: version.aestheticState,
      learningState: version.learningState,
      identityEmbedding: version.identityEmbedding,
      contentEmbedding: version.contentEmbedding,
      currentVersion: currentBrain.currentVersion + 1,
      updatedAt: new Date(),
    })
    .where(eq(identityBrains.id, identityBrainId))
    .returning()

  if (!updated) {
    throw Errors.internal('Failed to rollback')
  }

  return updated
}

/**
 * Delete a specific version (only manual snapshots can be deleted)
 */
export async function remove(versionId: string): Promise<void> {
  const version = await getById(versionId)
  if (!version) {
    throw Errors.notFound('Version')
  }

  if (version.versionType !== 'manual') {
    throw Errors.forbidden('Only manual snapshots can be deleted')
  }

  await db.delete(identityBrainVersions).where(eq(identityBrainVersions.id, versionId))
}

/**
 * Clean up old auto versions, keeping only the most recent ones
 */
async function cleanupOldAutoVersions(identityBrainId: string): Promise<void> {
  // Get all auto versions sorted by version number
  const autoVersions = await db
    .select({ id: identityBrainVersions.id, versionNumber: identityBrainVersions.versionNumber })
    .from(identityBrainVersions)
    .where(
      and(
        eq(identityBrainVersions.identityBrainId, identityBrainId),
        eq(identityBrainVersions.versionType, 'auto')
      )
    )
    .orderBy(desc(identityBrainVersions.versionNumber))

  // Keep only MAX_AUTO_VERSIONS
  if (autoVersions.length > MAX_AUTO_VERSIONS) {
    const toDelete = autoVersions.slice(MAX_AUTO_VERSIONS)
    const idsToDelete = toDelete.map((v) => v.id)

    for (const id of idsToDelete) {
      await db.delete(identityBrainVersions).where(eq(identityBrainVersions.id, id))
    }
  }
}

/**
 * Get version count for an identity brain
 */
export async function getVersionCount(identityBrainId: string): Promise<{
  total: number
  auto: number
  manual: number
}> {
  const versions = await db
    .select({ versionType: identityBrainVersions.versionType })
    .from(identityBrainVersions)
    .where(eq(identityBrainVersions.identityBrainId, identityBrainId))

  const auto = versions.filter((v) => v.versionType === 'auto').length
  const manual = versions.filter((v) => v.versionType === 'manual').length

  return {
    total: versions.length,
    auto,
    manual,
  }
}
