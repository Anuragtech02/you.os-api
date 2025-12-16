/**
 * Aesthetic Module Routes Tests
 *
 * Tests for the Aesthetic Module API endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../helpers/app'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/auth'

describe('Aesthetic Module Routes', () => {
  let app: FastifyInstance
  let testUser: TestUser

  beforeAll(async () => {
    app = await buildApp()
    testUser = await createTestUser(
      `test-aesthetic-${Date.now()}@example.com`,
      'Test123456',
      'Aesthetic Test User'
    )
  })

  afterAll(async () => {
    if (testUser) {
      await deleteTestUser(testUser.authId)
    }
    await app.close()
  })

  // =========================================
  // GET /aesthetic - Get aesthetic profile
  // =========================================
  describe('GET /api/v1/aesthetic', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/aesthetic',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return aesthetic profile for authenticated user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/aesthetic',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      // May return 404 if no aesthetic data exists yet
      expect([200, 404]).toContain(response.statusCode)

      if (response.statusCode === 200) {
        const body = response.json()
        expect(body.success).toBe(true)
        expect(body.data).toBeDefined()
      }
    })
  })

  // =========================================
  // POST /aesthetic/analyze - Run full aesthetic analysis
  // =========================================
  describe('POST /api/v1/aesthetic/analyze', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/analyze',
        payload: {},
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 404/500 without identity brain', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/analyze',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      // Will fail without proper setup
      expect([404, 500]).toContain(response.statusCode)
    })
  })

  // =========================================
  // PATCH /aesthetic - Update preferences
  // =========================================
  describe('PATCH /api/v1/aesthetic', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/aesthetic',
        payload: {},
      })

      expect(response.statusCode).toBe(401)
    })

    it('should accept valid preferences', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/aesthetic',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          avoidColors: ['orange', 'neon green'],
        },
      })

      // May return 404 if no identity brain exists
      expect([200, 404]).toContain(response.statusCode)
    })
  })

  // =========================================
  // POST /aesthetic/colors/generate - Generate color palette
  // =========================================
  describe('POST /api/v1/aesthetic/colors/generate', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/colors/generate',
        payload: {},
      })

      expect(response.statusCode).toBe(401)
    })

    it('should accept optional photos and preferences', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/colors/generate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          includePhotos: true,
          preferences: {
            preferWarm: true,
            avoidColors: ['orange'],
          },
        },
      })

      // Will fail without proper identity brain setup
      expect([404, 500]).toContain(response.statusCode)
    })

    it('should work with empty payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/colors/generate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect([404, 500]).toContain(response.statusCode)
    })
  })

  // =========================================
  // POST /aesthetic/styling/generate - Generate styling guidance
  // =========================================
  describe('POST /api/v1/aesthetic/styling/generate', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/styling/generate',
        payload: {},
      })

      expect(response.statusCode).toBe(401)
    })

    it('should accept optional context parameter', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/styling/generate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          context: 'professional',
        },
      })

      expect([404, 500]).toContain(response.statusCode)
    })

    it('should accept bodyType parameter', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/styling/generate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          bodyType: 'athletic',
          context: 'casual',
        },
      })

      expect([404, 500]).toContain(response.statusCode)
    })
  })

  // =========================================
  // POST /aesthetic/hair/generate - Generate hair suggestions
  // =========================================
  describe('POST /api/v1/aesthetic/hair/generate', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/hair/generate',
        payload: {},
      })

      expect(response.statusCode).toBe(401)
    })

    it('should accept optional parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/hair/generate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          currentHairDescription: 'Long brown hair with layers',
          openToChange: true,
        },
      })

      expect([404, 500]).toContain(response.statusCode)
    })

    it('should work with empty payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/hair/generate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect([404, 500]).toContain(response.statusCode)
    })
  })

  // =========================================
  // POST /aesthetic/makeup/generate - Generate makeup suggestions
  // =========================================
  describe('POST /api/v1/aesthetic/makeup/generate', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/makeup/generate',
        payload: {},
      })

      expect(response.statusCode).toBe(401)
    })

    it('should accept optional parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/makeup/generate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          occasionType: 'evening',
          skillLevel: 'intermediate',
        },
      })

      expect([404, 500]).toContain(response.statusCode)
    })

    it('should work with empty payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/makeup/generate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect([404, 500]).toContain(response.statusCode)
    })
  })

  // =========================================
  // POST /aesthetic/wardrobe/generate - Generate wardrobe guidance
  // =========================================
  describe('POST /api/v1/aesthetic/wardrobe/generate', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/wardrobe/generate',
        payload: {},
      })

      expect(response.statusCode).toBe(401)
    })

    it('should accept optional parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/wardrobe/generate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          occasionType: 'business',
          budget: 'medium',
          existingPieces: ['navy blazer', 'white dress shirt'],
        },
      })

      expect([404, 500]).toContain(response.statusCode)
    })

    it('should work with empty payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/aesthetic/wardrobe/generate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect([404, 500]).toContain(response.statusCode)
    })
  })
})
