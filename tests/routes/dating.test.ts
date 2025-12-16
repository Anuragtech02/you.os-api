/**
 * Dating Module Routes Tests
 *
 * Tests for the Dating Module API endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../helpers/app'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/auth'

describe('Dating Module Routes', () => {
  let app: FastifyInstance
  let testUser: TestUser

  beforeAll(async () => {
    app = await buildApp()
    testUser = await createTestUser(
      `test-dating-${Date.now()}@example.com`,
      'Test123456',
      'Dating Test User'
    )
  })

  afterAll(async () => {
    if (testUser) {
      await deleteTestUser(testUser.authId)
    }
    await app.close()
  })

  // =========================================
  // GET /dating/platforms - List platforms
  // =========================================
  describe('GET /api/v1/dating/platforms', () => {
    it('should return list of supported platforms', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dating/platforms',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.platforms).toBeDefined()
      expect(Array.isArray(body.data.platforms)).toBe(true)
    })

    it('should include Tinder, Hinge, Bumble', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dating/platforms',
      })

      const body = response.json()
      const platformIds = body.data.platforms.map((p: { id: string }) => p.id)

      expect(platformIds).toContain('tinder')
      expect(platformIds).toContain('hinge')
      expect(platformIds).toContain('bumble')
      expect(platformIds).toContain('general')
    })
  })

  // =========================================
  // GET /dating/prompts/hinge - Get Hinge prompts
  // =========================================
  describe('GET /api/v1/dating/prompts/hinge', () => {
    it('should return list of Hinge prompts', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dating/prompts/hinge',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.prompts).toBeDefined()
      expect(Array.isArray(body.data.prompts)).toBe(true)
      expect(body.data.prompts.length).toBeGreaterThan(10)
    })
  })

  // =========================================
  // GET /dating/content - List content
  // =========================================
  describe('GET /api/v1/dating/content', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dating/content',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return empty list for new user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dating/content',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.content).toBeDefined()
      expect(Array.isArray(body.data.content)).toBe(true)
    })

    it('should support platform filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dating/content?platform=tinder',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
    })
  })

  // =========================================
  // POST /dating/bio - Generate bio
  // =========================================
  describe('POST /api/v1/dating/bio', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/bio',
        payload: { platform: 'tinder' },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should require platform', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/bio',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })

    it('should validate platform enum', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/bio',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: { platform: 'invalid_platform' },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 404 if identity brain not set up', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/bio',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          platform: 'tinder',
          saveToHistory: false,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  // =========================================
  // POST /dating/prompt - Generate prompt answer
  // =========================================
  describe('POST /api/v1/dating/prompt', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/prompt',
        payload: {
          platform: 'hinge',
          promptQuestion: "I'm looking for",
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should require platform and promptQuestion', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/prompt',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })

    it('should validate promptQuestion minimum length', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/prompt',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          platform: 'hinge',
          promptQuestion: 'Hi', // Too short
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  // =========================================
  // POST /dating/messaging/opener - Generate openers
  // =========================================
  describe('POST /api/v1/dating/messaging/opener', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/messaging/opener',
        payload: {},
      })

      expect(response.statusCode).toBe(401)
    })

    it('should accept optional match info', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/messaging/opener',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          matchBio: 'Love hiking and coffee',
          matchPhotosDescription: 'Photos show outdoor activities',
          tone: 'witty',
        },
      })

      expect([404, 500]).toContain(response.statusCode)
    })

    it('should validate tone enum', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/messaging/opener',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          tone: 'invalid_tone',
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  // =========================================
  // POST /dating/messaging/reply - Generate replies
  // =========================================
  describe('POST /api/v1/dating/messaging/reply', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/messaging/reply',
        payload: {
          conversationHistory: [
            { sender: 'match', message: 'Hey!' },
          ],
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should require conversation history', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/messaging/reply',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })

    it('should validate conversation history format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/messaging/reply',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          conversationHistory: [
            { sender: 'invalid', message: 'Hey!' },
          ],
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  // =========================================
  // POST /dating/messaging/improve - Improve message
  // =========================================
  describe('POST /api/v1/dating/messaging/improve', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/messaging/improve',
        payload: {
          draftMessage: 'Hey, how are you?',
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should require draftMessage', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/messaging/improve',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })
  })

  // =========================================
  // POST /dating/messaging/analyze - Analyze conversation
  // =========================================
  describe('POST /api/v1/dating/messaging/analyze', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/messaging/analyze',
        payload: {
          conversationHistory: [
            { sender: 'user', message: 'Hey!' },
            { sender: 'match', message: 'Hi there!' },
          ],
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should require at least 2 messages', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/messaging/analyze',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          conversationHistory: [
            { sender: 'user', message: 'Hey!' },
          ],
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  // =========================================
  // GET /dating/photos/ranking - Get photo ranking
  // =========================================
  describe('GET /api/v1/dating/photos/ranking', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dating/photos/ranking',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 404 if user has no photos', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dating/photos/ranking',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  // =========================================
  // POST /dating/coaching/tasks - Generate tasks
  // =========================================
  describe('POST /api/v1/dating/coaching/tasks', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/coaching/tasks',
        payload: {},
      })

      expect(response.statusCode).toBe(401)
    })

    it('should accept optional parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/coaching/tasks',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          currentProfileScore: 65,
          focusArea: 'profile',
          completedTasks: ['Update bio'],
        },
      })

      expect([404, 500]).toContain(response.statusCode)
    })

    it('should use default when focusArea is invalid (lenient validation)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dating/coaching/tasks',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          focusArea: 'invalid_area',
        },
      })

      // Route uses lenient validation - invalid values cause it to use defaults
      // Then fails because identity brain not set up
      expect([404, 500]).toContain(response.statusCode)
    })
  })

  // =========================================
  // GET /dating/content/:id - Get content
  // =========================================
  describe('GET /api/v1/dating/content/:id', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dating/content/00000000-0000-0000-0000-000000000000',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 400 for invalid UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dating/content/invalid-id',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 404 for non-existent content', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dating/content/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  // =========================================
  // DELETE /dating/content/:id - Delete content
  // =========================================
  describe('DELETE /api/v1/dating/content/:id', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/dating/content/00000000-0000-0000-0000-000000000000',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 404 for non-existent content', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/dating/content/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })
})
