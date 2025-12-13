/**
 * Bio Generator Routes Tests
 *
 * Tests for the Bio Generator API endpoints.
 * Uses Fastify's inject() for testing without starting a server.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../helpers/app'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/auth'

describe('Bio Generator Routes', () => {
  let app: FastifyInstance
  let testUser: TestUser

  beforeAll(async () => {
    app = await buildApp()
    // Create a test user for all Bio Generator tests
    testUser = await createTestUser(
      `test-bio-${Date.now()}@example.com`,
      'Test123456',
      'Bio Test User'
    )
  })

  afterAll(async () => {
    if (testUser) {
      await deleteTestUser(testUser.authId)
    }
    await app.close()
  })

  // =========================================
  // GET /bios/platforms - List supported platforms
  // =========================================
  describe('GET /api/v1/bios/platforms', () => {
    it('should return list of supported platforms', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/bios/platforms',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.platforms).toBeDefined()
      expect(Array.isArray(body.data.platforms)).toBe(true)
      expect(body.data.platforms.length).toBeGreaterThan(0)

      // Check platform structure
      const platform = body.data.platforms[0]
      expect(platform.id).toBeDefined()
      expect(platform.name).toBeDefined()
      expect(platform.maxLength).toBeDefined()
    })

    it('should include all expected platforms', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/bios/platforms',
      })

      const body = response.json()
      const platformIds = body.data.platforms.map((p: { id: string }) => p.id)

      expect(platformIds).toContain('twitter')
      expect(platformIds).toContain('instagram')
      expect(platformIds).toContain('linkedin_summary')
      expect(platformIds).toContain('linkedin_headline')
      expect(platformIds).toContain('tinder')
      expect(platformIds).toContain('hinge')
      expect(platformIds).toContain('bumble')
    })
  })

  // =========================================
  // GET /bios - List generated bios
  // =========================================
  describe('GET /api/v1/bios', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/bios',
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.success).toBe(false)
    })

    it('should return empty list for new user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/bios',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.bios).toBeDefined()
      expect(Array.isArray(body.data.bios)).toBe(true)
    })

    it('should support pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/bios?limit=5&offset=0',
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
  // POST /bios/generate - Generate bio
  // =========================================
  describe('POST /api/v1/bios/generate', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/bios/generate',
        payload: { platform: 'twitter' },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should reject invalid platform', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/bios/generate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: { platform: 'invalid_platform' },
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject missing platform', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/bios/generate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 404 when user has no identity brain', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/bios/generate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: { platform: 'twitter' },
      })

      // Without identity brain, should return not found
      expect(response.statusCode).toBe(404)
      const body = response.json()
      expect(body.success).toBe(false)
    })
  })

  // =========================================
  // POST /bios/dating-prompt - Generate dating prompt answer
  // =========================================
  describe('POST /api/v1/bios/dating-prompt', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/bios/dating-prompt',
        payload: { promptQuestion: 'What are you looking for?' },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should reject missing prompt question', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/bios/dating-prompt',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })

    it('should reject too short prompt question', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/bios/dating-prompt',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: { promptQuestion: 'hi' },
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  // =========================================
  // GET /bios/:id - Get specific bio
  // =========================================
  describe('GET /api/v1/bios/:id', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/bios/00000000-0000-0000-0000-000000000000',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 400 for invalid UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/bios/invalid-id',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 404 for non-existent bio', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/bios/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  // =========================================
  // DELETE /bios/:id - Delete bio
  // =========================================
  describe('DELETE /api/v1/bios/:id', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/bios/00000000-0000-0000-0000-000000000000',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 404 for non-existent bio', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/bios/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  // =========================================
  // POST /bios/:id/regenerate - Regenerate with feedback
  // =========================================
  describe('POST /api/v1/bios/:id/regenerate', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/bios/00000000-0000-0000-0000-000000000000/regenerate',
        payload: { feedback: 'Make it more professional' },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should reject missing feedback', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/bios/00000000-0000-0000-0000-000000000000/regenerate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })

    it('should reject too short feedback', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/bios/00000000-0000-0000-0000-000000000000/regenerate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: { feedback: 'short' },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 404 for non-existent bio', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/bios/00000000-0000-0000-0000-000000000000/regenerate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: { feedback: 'Make it more professional and add more keywords' },
      })

      expect(response.statusCode).toBe(404)
    })
  })
})
