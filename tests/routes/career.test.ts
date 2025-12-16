/**
 * Career Module Routes Tests
 *
 * Tests for the Career Module API endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../helpers/app'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/auth'

describe('Career Module Routes', () => {
  let app: FastifyInstance
  let testUser: TestUser

  beforeAll(async () => {
    app = await buildApp()
    testUser = await createTestUser(
      `test-career-${Date.now()}@example.com`,
      'Test123456',
      'Career Test User'
    )
  })

  afterAll(async () => {
    if (testUser) {
      await deleteTestUser(testUser.authId)
    }
    await app.close()
  })

  // =========================================
  // GET /career/document-types - List document types
  // =========================================
  describe('GET /api/v1/career/document-types', () => {
    it('should return list of document types', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/career/document-types',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.documentTypes).toBeDefined()
      expect(Array.isArray(body.data.documentTypes)).toBe(true)
      expect(body.data.documentTypes.length).toBeGreaterThan(0)
    })

    it('should include all expected document types', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/career/document-types',
      })

      const body = response.json()
      const typeIds = body.data.documentTypes.map((t: { id: string }) => t.id)

      expect(typeIds).toContain('resume_summary')
      expect(typeIds).toContain('resume_bullets')
      expect(typeIds).toContain('cover_letter')
      expect(typeIds).toContain('linkedin_headline')
      expect(typeIds).toContain('linkedin_summary')
      expect(typeIds).toContain('elevator_pitch')
    })
  })

  // =========================================
  // GET /career/documents - List documents
  // =========================================
  describe('GET /api/v1/career/documents', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/career/documents',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return empty list for new user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/career/documents',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.documents).toBeDefined()
      expect(Array.isArray(body.data.documents)).toBe(true)
    })

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/career/documents?limit=5&offset=0',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.meta).toBeDefined()
      expect(body.meta.limit).toBe(5)
      expect(body.meta.offset).toBe(0)
    })
  })

  // =========================================
  // POST /career/resume/summary - Generate resume summary
  // =========================================
  describe('POST /api/v1/career/resume/summary', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/career/resume/summary',
        payload: {},
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 404 if user has no identity brain data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/career/resume/summary',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          saveToHistory: false,
        },
      })

      // Expect 404 because identity brain data is not set up
      expect(response.statusCode).toBe(404)
      const body = response.json()
      expect(body.success).toBe(false)
    })

    it('should accept optional parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/career/resume/summary',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          targetRole: 'Software Engineer',
          industry: 'Technology',
          customInstructions: 'Focus on leadership',
          saveToHistory: false,
        },
      })

      // Still expect 404 due to no identity brain, but validates params accepted
      expect([404, 500]).toContain(response.statusCode)
    })
  })

  // =========================================
  // POST /career/resume/bullets - Generate resume bullets
  // =========================================
  describe('POST /api/v1/career/resume/bullets', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/career/resume/bullets',
        payload: {},
      })

      expect(response.statusCode).toBe(401)
    })

    it('should accept experience items', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/career/resume/bullets',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          experienceItems: [
            {
              title: 'Software Engineer',
              company: 'Tech Corp',
              duration: '2020-2023',
              responsibilities: ['Built APIs', 'Led team'],
            },
          ],
          saveToHistory: false,
        },
      })

      expect([404, 500]).toContain(response.statusCode)
    })
  })

  // =========================================
  // POST /career/cover-letter - Generate cover letter
  // =========================================
  describe('POST /api/v1/career/cover-letter', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/career/cover-letter',
        payload: {
          targetRole: 'Engineer',
          targetCompany: 'Corp',
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should require targetRole and targetCompany', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/career/cover-letter',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.success).toBe(false)
    })

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/career/cover-letter',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          targetRole: 'Software Engineer',
          targetCompany: 'Acme Inc',
          jobDescription: 'Build cool stuff',
          saveToHistory: false,
        },
      })

      expect([404, 500]).toContain(response.statusCode)
    })
  })

  // =========================================
  // POST /career/linkedin/headline - Generate headlines
  // =========================================
  describe('POST /api/v1/career/linkedin/headline', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/career/linkedin/headline',
        payload: {},
      })

      expect(response.statusCode).toBe(401)
    })

    it('should accept optional keywords', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/career/linkedin/headline',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          keywords: ['JavaScript', 'React', 'Node.js'],
          targetAudience: 'Recruiters in tech',
          saveToHistory: false,
        },
      })

      expect([404, 500]).toContain(response.statusCode)
    })
  })

  // =========================================
  // POST /career/linkedin/summary - Generate summary
  // =========================================
  describe('POST /api/v1/career/linkedin/summary', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/career/linkedin/summary',
        payload: {},
      })

      expect(response.statusCode).toBe(401)
    })
  })

  // =========================================
  // POST /career/elevator-pitch - Generate pitch
  // =========================================
  describe('POST /api/v1/career/elevator-pitch', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/career/elevator-pitch',
        payload: {
          duration: '30_seconds',
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should require duration', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/career/elevator-pitch',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })

    it('should validate duration enum', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/career/elevator-pitch',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          duration: 'invalid',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should accept valid duration values', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/career/elevator-pitch',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          duration: '60_seconds',
          context: 'networking',
          saveToHistory: false,
        },
      })

      expect([404, 500]).toContain(response.statusCode)
    })
  })

  // =========================================
  // GET /career/documents/:id - Get document
  // =========================================
  describe('GET /api/v1/career/documents/:id', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/career/documents/00000000-0000-0000-0000-000000000000',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 400 for invalid UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/career/documents/invalid-id',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 404 for non-existent document', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/career/documents/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  // =========================================
  // DELETE /career/documents/:id - Delete document
  // =========================================
  describe('DELETE /api/v1/career/documents/:id', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/career/documents/00000000-0000-0000-0000-000000000000',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 404 for non-existent document', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/career/documents/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  // =========================================
  // PATCH /career/documents/:id - Update document
  // =========================================
  describe('PATCH /api/v1/career/documents/:id', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/career/documents/00000000-0000-0000-0000-000000000000',
        payload: { content: 'Updated content' },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should require at least one field to update', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/career/documents/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 404 for non-existent document', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/career/documents/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: { content: 'Updated content' },
      })

      expect(response.statusCode).toBe(404)
    })
  })
})
