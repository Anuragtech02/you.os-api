/**
 * Identity Brain Routes Tests
 *
 * Tests for the Identity Brain API endpoints.
 * Uses Fastify's inject() for testing without starting a server.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../helpers/app'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/auth'

describe('Identity Brain Routes', () => {
  let app: FastifyInstance
  let testUser: TestUser

  beforeAll(async () => {
    app = await buildApp()
    // Create a test user for all Identity Brain tests
    testUser = await createTestUser(
      `test-identity-${Date.now()}@example.com`,
      'Test123456',
      'Identity Test User'
    )
  })

  afterAll(async () => {
    if (testUser) {
      await deleteTestUser(testUser.authId)
    }
    await app.close()
  })

  // =========================================
  // GET /identity-brain - Get current user's identity brain
  // =========================================
  describe('GET /api/v1/identity-brain', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/identity-brain',
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.success).toBe(false)
    })

    // Note: We can't easily test 404 because we need a user without an identity brain
    // and our test user may already have one from previous runs or the creation test
  })

  // =========================================
  // POST /identity-brain - Create identity brain
  // =========================================
  describe('POST /api/v1/identity-brain', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/identity-brain',
        payload: {},
      })

      expect(response.statusCode).toBe(401)
    })

    it('should create identity brain or return 409 if exists', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/identity-brain',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      // Either creates new (201) or already exists (409)
      expect([201, 409]).toContain(response.statusCode)
      const body = response.json()

      if (response.statusCode === 201) {
        expect(body.success).toBe(true)
        expect(body.data.identityBrain).toBeDefined()
        expect(body.data.identityBrain.userId).toBeDefined()
        expect(body.data.identityBrain.coreAttributes).toBeDefined()
        expect(body.data.identityBrain.aestheticState).toBeDefined()
        expect(body.data.identityBrain.learningState).toBeDefined()
      } else {
        expect(body.success).toBe(false)
        expect(body.error.code).toBe('ALREADY_EXISTS')
      }
    })
  })

  // =========================================
  // GET /identity-brain (after creation)
  // =========================================
  describe('GET /api/v1/identity-brain (after creation)', () => {
    it('should return the identity brain with personas', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/identity-brain',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.identityBrain).toBeDefined()
      expect(body.data.identityBrain.personas).toBeDefined()
      expect(Array.isArray(body.data.identityBrain.personas)).toBe(true)
      // Should have 4 default personas
      expect(body.data.identityBrain.personas.length).toBe(4)
    })
  })

  // =========================================
  // PATCH /identity-brain/attributes - Update core attributes
  // =========================================
  describe('PATCH /api/v1/identity-brain/attributes', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/identity-brain/attributes',
        payload: { name: 'Test' },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should update core attributes', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/identity-brain/attributes',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'Updated Name',
          occupation: 'Software Engineer',
          interests: ['coding', 'music', 'travel'],
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.identityBrain.coreAttributes.name).toBe('Updated Name')
      expect(body.data.identityBrain.coreAttributes.occupation).toBe('Software Engineer')
      expect(body.data.identityBrain.coreAttributes.interests).toEqual(['coding', 'music', 'travel'])
    })
  })

  // =========================================
  // PATCH /identity-brain/aesthetic - Update aesthetic state
  // =========================================
  describe('PATCH /api/v1/identity-brain/aesthetic', () => {
    it('should update aesthetic state', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/identity-brain/aesthetic',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          styleArchetype: 'Minimalist Modern',
          hairSuggestions: ['Short layered cut', 'Natural highlights'],
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.identityBrain.aestheticState.styleArchetype).toBe('Minimalist Modern')
    })
  })

  // =========================================
  // GET /identity-brain/personas - List personas
  // =========================================
  describe('GET /api/v1/identity-brain/personas', () => {
    it('should list all personas', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/identity-brain/personas',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.personas).toBeDefined()
      expect(body.data.personas.length).toBe(4)

      // Check default personas exist
      const types = body.data.personas.map((p: { personaType: string }) => p.personaType)
      expect(types).toContain('professional')
      expect(types).toContain('dating')
      expect(types).toContain('social')
      expect(types).toContain('private')
    })
  })

  // =========================================
  // POST /identity-brain/personas/:type/activate - Activate persona
  // =========================================
  describe('POST /api/v1/identity-brain/personas/:type/activate', () => {
    it('should activate a persona', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/identity-brain/personas/dating/activate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.persona.personaType).toBe('dating')
      expect(body.data.persona.isActive).toBe(true)
    })

    it('should reject invalid persona type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/identity-brain/personas/invalid/activate',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  // =========================================
  // PATCH /identity-brain/personas/:type - Update persona
  // =========================================
  describe('PATCH /api/v1/identity-brain/personas/:type', () => {
    it('should update a persona', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/identity-brain/personas/professional',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'Career Pro',
          description: 'My professional brand',
          toneWeights: { formal: 0.9, confident: 0.85 },
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.persona.name).toBe('Career Pro')
    })
  })

  // =========================================
  // GET /identity-brain/versions - List versions
  // =========================================
  describe('GET /api/v1/identity-brain/versions', () => {
    it('should list versions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/identity-brain/versions',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.versions).toBeDefined()
      expect(Array.isArray(body.data.versions)).toBe(true)
      // Should have versions from our attribute and aesthetic updates
      expect(body.data.versions.length).toBeGreaterThan(0)
    })
  })

  // =========================================
  // POST /identity-brain/versions/snapshot - Create snapshot
  // =========================================
  describe('POST /api/v1/identity-brain/versions/snapshot', () => {
    it('should create a manual snapshot', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/identity-brain/versions/snapshot',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'Before major changes',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.version).toBeDefined()
      expect(body.data.version.versionType).toBe('manual')
      expect(body.data.version.snapshotName).toBe('Before major changes')
    })

    it('should require a snapshot name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/identity-brain/versions/snapshot',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })
  })

  // =========================================
  // GET /identity-brain/embeddings/status - Embedding status
  // =========================================
  describe('GET /api/v1/identity-brain/embeddings/status', () => {
    it('should get embedding status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/identity-brain/embeddings/status',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.status).toBeDefined()
      expect(typeof body.data.status.hasIdentityEmbedding).toBe('boolean')
      expect(typeof body.data.status.hasContentEmbedding).toBe('boolean')
    })
  })

  // =========================================
  // GET /identity-brain/insights - Learning insights
  // =========================================
  describe('GET /api/v1/identity-brain/insights', () => {
    it('should get learning insights', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/identity-brain/insights',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.insights).toBeDefined()
      expect(typeof body.data.insights.totalFeedback).toBe('number')
      expect(typeof body.data.insights.positiveRate).toBe('number')
    })
  })
})
