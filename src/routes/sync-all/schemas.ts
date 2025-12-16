/**
 * Sync-All Routes Validation Schemas
 */

import { z } from 'zod'

// Trigger sync request
export const triggerSyncSchema = z.object({
  force: z.boolean().default(false),
  skipModules: z.array(z.enum([
    'photo_engine',
    'bio_generator',
    'career_module',
    'dating_module',
    'aesthetic_module',
  ])).default([]),
})

// List jobs query
export const listJobsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

// Job ID parameter
export const jobIdSchema = z.string().uuid('Invalid job ID')
