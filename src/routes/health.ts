import { sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { db } from '@/db/client'
import { checkBucketHealth, STORAGE_CONFIG } from '@/services/photos/storage'

export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/health', async () => {
    return {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version ?? '0.1.0',
      },
    }
  })

  // Detailed health check (for monitoring)
  fastify.get('/health/detailed', async () => {
    const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; error?: string; bucket?: string }> =
      {}

    // Database check
    const dbStart = performance.now()
    try {
      await db.execute(sql`SELECT 1`)
      checks.database = {
        status: 'ok',
        latencyMs: Math.round(performance.now() - dbStart),
      }
    } catch (err) {
      checks.database = {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }

    // Storage check
    const storageStart = performance.now()
    try {
      const bucketExists = await checkBucketHealth()
      if (bucketExists) {
        checks.storage = {
          status: 'ok',
          latencyMs: Math.round(performance.now() - storageStart),
          bucket: STORAGE_CONFIG.bucket,
        }
      } else {
        checks.storage = {
          status: 'error',
          error: `Bucket "${STORAGE_CONFIG.bucket}" not found`,
          bucket: STORAGE_CONFIG.bucket,
        }
      }
    } catch (err) {
      checks.storage = {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        bucket: STORAGE_CONFIG.bucket,
      }
    }

    // Memory usage
    const memUsage = process.memoryUsage()

    const allHealthy = Object.values(checks).every((c) => c.status === 'ok')

    return {
      success: allHealthy,
      data: {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version ?? '0.1.0',
        runtime: 'bun',
        checks,
        memory: {
          heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
          rssMb: Math.round(memUsage.rss / 1024 / 1024),
        },
        uptime: Math.round(process.uptime()),
      },
    }
  })
}
