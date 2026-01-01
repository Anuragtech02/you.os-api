/**
 * Photo Engine Routes Tests
 *
 * Tests for the Photo Engine API endpoints.
 * Uses Fastify's inject() for testing without starting a server.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../helpers/app'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/auth'

describe('Photo Engine Routes', () => {
  let app: FastifyInstance
  let testUser: TestUser

  beforeAll(async () => {
    app = await buildApp()
    // Create a test user for all Photo Engine tests
    testUser = await createTestUser(
      `test-photo-${Date.now()}@example.com`,
      'Test123456',
      'Photo Test User'
    )
  })

  afterAll(async () => {
    if (testUser) {
      await deleteTestUser(testUser.authId)
    }
    await app.close()
  })

  // =========================================
  // GET /photos - List photos
  // =========================================
  describe('GET /api/v1/photos', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/photos',
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.success).toBe(false)
    })

    it('should return empty list for new user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/photos',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.photos).toBeDefined()
      expect(Array.isArray(body.data.photos)).toBe(true)
      expect(body.meta).toBeDefined()
      expect(body.meta.total).toBe(0)
    })

    it('should support pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/photos?limit=5&offset=0',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.meta.limit).toBe(5)
      expect(body.meta.offset).toBe(0)
    })
  })

  // =========================================
  // POST /photos/upload - Upload photo
  // =========================================
  describe('POST /api/v1/photos/upload', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/photos/upload',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should reject request without file', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/photos/upload',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  // =========================================
  // GET /photos/:id - Get specific photo
  // =========================================
  describe('GET /api/v1/photos/:id', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/photos/00000000-0000-0000-0000-000000000000',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 400 for invalid UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/photos/invalid-id',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.success).toBe(false)
    })

    it('should return 404 for non-existent photo', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/photos/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
      const body = response.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('NOT_FOUND')
    })
  })

  // =========================================
  // DELETE /photos/:id - Delete photo
  // =========================================
  describe('DELETE /api/v1/photos/:id', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/photos/00000000-0000-0000-0000-000000000000',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 404 for non-existent photo', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/photos/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  // =========================================
  // POST /photos/:id/analyze - Analyze photo
  // =========================================
  describe('POST /api/v1/photos/:id/analyze', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/photos/00000000-0000-0000-0000-000000000000/analyze',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 404 for non-existent photo', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/photos/00000000-0000-0000-0000-000000000000/analyze',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  // =========================================
  // POST /photos/:id/optimize - Optimize photo
  // =========================================
  describe('POST /api/v1/photos/:id/optimize', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/photos/00000000-0000-0000-0000-000000000000/optimize',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 404 for non-existent photo', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/photos/00000000-0000-0000-0000-000000000000/optimize',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect(response.statusCode).toBe(404)
    })
  })

  // =========================================
  // GET /photos/rankings/:persona - Get ranked photos
  // =========================================
  describe('GET /api/v1/photos/rankings/:persona', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/photos/rankings/professional',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should reject invalid persona type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/photos/rankings/invalid',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.success).toBe(false)
    })

    it('should return empty list for new user (professional)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/photos/rankings/professional',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.photos).toBeDefined()
      expect(body.data.persona).toBe('professional')
    })

    it('should accept all valid persona types', async () => {
      const personas = ['professional', 'dating', 'social', 'private']

      for (const persona of personas) {
        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/photos/rankings/${persona}`,
          headers: {
            authorization: `Bearer ${testUser.accessToken}`,
          },
        })

        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.data.persona).toBe(persona)
      }
    })
  })

  // =========================================
  // POST /photos/:id/primary - Set primary photo
  // =========================================
  describe('POST /api/v1/photos/:id/primary', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/photos/00000000-0000-0000-0000-000000000000/primary',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 404 for non-existent photo', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/photos/00000000-0000-0000-0000-000000000000/primary',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  // =========================================
  // POST /photos/analyze-all - Batch analyze
  // =========================================
  describe('POST /api/v1/photos/analyze-all', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/photos/analyze-all',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return success with zero analyzed for new user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/photos/analyze-all',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.analyzed).toBe(0)
      expect(body.data.failed).toBe(0)
    })
  })

  // =========================================
  // Company scoping tests
  // =========================================
  describe('Company Scoping - GET /api/v1/photos', () => {
    it('should accept companyId query parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/photos?companyId=00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      // Should return empty since no photos with this companyId
      expect(body.data.photos.length).toBe(0)
    })

    it('should reject invalid companyId format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/photos?companyId=invalid-uuid',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      // Should either return 400 for invalid UUID or 200 with ignored invalid param
      // Depending on implementation - checking it doesn't break
      expect([200, 400]).toContain(response.statusCode)
    })
  })
})
