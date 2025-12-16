/**
 * Sync Events Service
 *
 * Handles creation and processing of sync events that trigger
 * propagation of Identity Brain changes across modules.
 */

import { db } from '@/db/client'
import { syncEvents, type SyncEvent } from '@/db/schema/sync'
import { eq, and, isNull, asc, desc } from 'drizzle-orm'

export type SyncEventType =
  | 'content_generated'
  | 'feedback_received'
  | 'photo_analyzed'
  | 'profile_updated'
  | 'sync_all_triggered'

export interface EventPayload {
  moduleId?: string
  contentType?: string
  contentId?: string
  feedbackType?: string
  photoId?: string
  changes?: string[]
  jobId?: string
  [key: string]: unknown
}

/**
 * Create a new sync event
 */
export async function createSyncEvent(
  userId: string,
  eventType: SyncEventType,
  payload: EventPayload = {}
): Promise<SyncEvent> {
  // Get the next sequence number for this user
  const lastEvent = await db
    .select({ sequenceNumber: syncEvents.sequenceNumber })
    .from(syncEvents)
    .where(eq(syncEvents.userId, userId))
    .orderBy(syncEvents.sequenceNumber)
    .limit(1)

  const nextSequence = lastEvent.length > 0 && lastEvent[0] ? lastEvent[0].sequenceNumber + 1 : 1

  const [event] = await db
    .insert(syncEvents)
    .values({
      userId,
      eventType,
      payload,
      sequenceNumber: nextSequence,
    })
    .returning()

  return event!
}

/**
 * Get unprocessed events for a user
 */
export async function getUnprocessedEvents(
  userId: string,
  limit = 100
): Promise<SyncEvent[]> {
  return db
    .select()
    .from(syncEvents)
    .where(and(eq(syncEvents.userId, userId), isNull(syncEvents.processedAt)))
    .orderBy(asc(syncEvents.sequenceNumber))
    .limit(limit)
}

/**
 * Mark an event as processed
 */
export async function markEventProcessed(
  eventId: string,
  error?: string
): Promise<void> {
  await db
    .update(syncEvents)
    .set({
      processedAt: new Date(),
      error: error || null,
    })
    .where(eq(syncEvents.id, eventId))
}

/**
 * Mark multiple events as processed
 */
export async function markEventsProcessed(
  eventIds: string[],
  error?: string
): Promise<void> {
  for (const eventId of eventIds) {
    await markEventProcessed(eventId, error)
  }
}

/**
 * Get event by ID
 */
export async function getEventById(eventId: string): Promise<SyncEvent | null> {
  const [event] = await db
    .select()
    .from(syncEvents)
    .where(eq(syncEvents.id, eventId))
    .limit(1)

  return event || null
}

/**
 * Get recent events for a user
 */
export async function getRecentEvents(
  userId: string,
  limit = 50
): Promise<SyncEvent[]> {
  return db
    .select()
    .from(syncEvents)
    .where(eq(syncEvents.userId, userId))
    .orderBy(desc(syncEvents.createdAt))
    .limit(limit)
}

/**
 * Count unprocessed events
 */
export async function countUnprocessedEvents(userId: string): Promise<number> {
  const result = await db
    .select({ count: syncEvents.id })
    .from(syncEvents)
    .where(and(eq(syncEvents.userId, userId), isNull(syncEvents.processedAt)))

  return result.length
}
