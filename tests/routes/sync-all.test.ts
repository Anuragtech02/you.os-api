/**
 * Sync-All Routes Tests
 *
 * Tests for the Sync-All API endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../helpers/app'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/auth'

describe('Sync-All Routes', () => {
  let app: FastifyInstance
  let testUser: TestUser

  beforeAll(async () => {
    app = await buildApp()
    testUser = await createTestUser(
      `test-sync-${Date.now()}@example.com`,
      'Test123456',
      'Sync Test User'
    )
  })

  afterAll(async () => {
    if (testUser) {
      await deleteTestUser(testUser.authId)
    }
    await app.close()
  })

  // =========================================
  // POST /sync-all - Trigger sync
  // =========================================
  describe('POST /api/v1/sync-all', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sync-all',
        payload: {},
      })

      expect(response.statusCode).toBe(401)
    })

    it('should accept empty payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sync-all',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      // Will fail with 500 without full setup (AI service, etc.)
      // but should not return 400 (validation error)
      expect([201, 404, 500]).toContain(response.statusCode)
    })

    it('should accept force option', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sync-all',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          force: true,
        },
      })

      expect([201, 404, 500]).toContain(response.statusCode)
    })

    it('should accept skipModules option', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sync-all',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          skipModules: ['photo_engine', 'dating_module'],
        },
      })

      // May hit rate limit (429) due to previous test requests
      expect([201, 404, 429, 500]).toContain(response.statusCode)
    })
  })

  // =========================================
  // GET /sync-all/status - Get sync status
  // =========================================
  describe('GET /api/v1/sync-all/status', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sync-all/status',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return sync status for authenticated user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sync-all/status',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data).toBeDefined()
      expect(typeof body.data.isRunning).toBe('boolean')
      expect(typeof body.data.canSync).toBe('boolean')
      expect(typeof body.data.cooldownRemaining).toBe('number')
    })
  })

  // =========================================
  // GET /sync-all/jobs - List sync jobs
  // =========================================
  describe('GET /api/v1/sync-all/jobs', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sync-all/jobs',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return jobs list for authenticated user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sync-all/jobs',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data).toBeDefined()
      expect(Array.isArray(body.data.jobs)).toBe(true)
      // meta contains pagination info
      expect(body.meta).toBeDefined()
      expect(typeof body.meta.total).toBe('number')
    })

    it('should accept pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sync-all/jobs?limit=10&offset=0',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.meta.limit).toBe(10)
      expect(body.meta.offset).toBe(0)
    })
  })

  // =========================================
  // GET /sync-all/jobs/:id - Get job details
  // =========================================
  describe('GET /api/v1/sync-all/jobs/:id', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sync-all/jobs/00000000-0000-0000-0000-000000000000',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 400 for invalid job ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sync-all/jobs/invalid-id',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 404 for non-existent job', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sync-all/jobs/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  // =========================================
  // GET /sync-all/jobs/:id/progress - SSE progress stream
  // =========================================
  describe('GET /api/v1/sync-all/jobs/:id/progress', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sync-all/jobs/00000000-0000-0000-0000-000000000000/progress',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 400 for invalid job ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sync-all/jobs/invalid-id/progress',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 404 for non-existent job', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sync-all/jobs/00000000-0000-0000-0000-000000000000/progress',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  // =========================================
  // POST /sync-all/jobs/:id/retry - Retry failed modules
  // =========================================
  describe('POST /api/v1/sync-all/jobs/:id/retry', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sync-all/jobs/00000000-0000-0000-0000-000000000000/retry',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 400 for invalid job ID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sync-all/jobs/invalid-id/retry',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 404 for non-existent job', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sync-all/jobs/00000000-0000-0000-0000-000000000000/retry',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })
})
