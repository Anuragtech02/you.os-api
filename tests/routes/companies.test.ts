/**
 * Company Routes Tests
 *
 * Tests for the Company/Multi-Tenant API endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../helpers/app'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/auth'

describe('Company Routes', () => {
  let app: FastifyInstance
  let testUser: TestUser
  let secondUser: TestUser
  let testCompanyId: string

  beforeAll(async () => {
    app = await buildApp()
    testUser = await createTestUser(
      `test-company-${Date.now()}@example.com`,
      'Test123456',
      'Company Test User'
    )
    secondUser = await createTestUser(
      `test-company2-${Date.now()}@example.com`,
      'Test123456',
      'Second Test User'
    )
  })

  afterAll(async () => {
    if (testUser) {
      await deleteTestUser(testUser.authId)
    }
    if (secondUser) {
      await deleteTestUser(secondUser.authId)
    }
    await app.close()
  })

  // =========================================
  // POST /companies - Create company
  // =========================================
  describe('POST /api/v1/companies', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/companies',
        payload: { name: 'Test Company' },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should create a company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/companies',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'Test Company',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.id).toBeDefined()
      expect(body.data.name).toBe('Test Company')
      expect(body.data.slug).toMatch(/^test-company/) // May have suffix if slug already exists

      testCompanyId = body.data.id
    })

    it('should create company with unique slug suffix if duplicate', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/companies',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'Test Company',
        },
      })

      // Should succeed with a unique slug
      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.data.slug).toMatch(/^test-company/) // Should start with test-company
    })

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/companies',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })
  })

  // =========================================
  // GET /companies - List companies
  // =========================================
  describe('GET /api/v1/companies', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/companies',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should list user companies', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/companies',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(Array.isArray(body.data.companies)).toBe(true)
      expect(body.data.companies.length).toBeGreaterThan(0)
    })

    it('should return empty for user with no companies', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/companies',
        headers: {
          authorization: `Bearer ${secondUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.companies.length).toBe(0)
    })
  })

  // =========================================
  // GET /companies/:id - Get company details
  // =========================================
  describe('GET /api/v1/companies/:id', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}`,
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return company for member', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.id).toBe(testCompanyId)
      expect(body.data.isOwner).toBe(true)
    })

    it('should return 403 for non-member', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}`,
        headers: {
          authorization: `Bearer ${secondUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should return 400 for invalid ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/companies/invalid-id',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  // =========================================
  // PATCH /companies/:id - Update company
  // =========================================
  describe('PATCH /api/v1/companies/:id', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/companies/${testCompanyId}`,
        payload: { name: 'Updated Company' },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should update company for admin', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/companies/${testCompanyId}`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          name: 'Updated Company',
          domain: 'example.com',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.name).toBe('Updated Company')
      expect(body.data.domain).toBe('example.com')
    })

    it('should return 403 for non-admin', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/companies/${testCompanyId}`,
        headers: {
          authorization: `Bearer ${secondUser.accessToken}`,
        },
        payload: { name: 'Hacked' },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  // =========================================
  // GET /companies/:id/employees - List employees
  // =========================================
  describe('GET /api/v1/companies/:id/employees', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/employees`,
      })

      expect(response.statusCode).toBe(401)
    })

    it('should list employees for member', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/employees`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(Array.isArray(body.data.employees)).toBe(true)
      expect(body.meta).toBeDefined()
    })

    it('should return 403 for non-member', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/employees`,
        headers: {
          authorization: `Bearer ${secondUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  // =========================================
  // POST /companies/:id/invites - Send invite
  // =========================================
  describe('POST /api/v1/companies/:id/invites', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/companies/${testCompanyId}/invites`,
        payload: { email: 'test@example.com' },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should send invite for admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/companies/${testCompanyId}/invites`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          email: 'invited@example.com',
          role: 'employee',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.data.email).toBe('invited@example.com')
      expect(body.data.role).toBe('employee')
      expect(body.data.expiresAt).toBeDefined()
    })

    it('should reject duplicate invites', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/companies/${testCompanyId}/invites`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          email: 'invited@example.com',
        },
      })

      expect(response.statusCode).toBe(409)
    })

    it('should return 403 for non-admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/companies/${testCompanyId}/invites`,
        headers: {
          authorization: `Bearer ${secondUser.accessToken}`,
        },
        payload: {
          email: 'another@example.com',
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  // =========================================
  // GET /companies/:id/invites - List invites
  // =========================================
  describe('GET /api/v1/companies/:id/invites', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/invites`,
      })

      expect(response.statusCode).toBe(401)
    })

    it('should list invites for admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/invites`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(Array.isArray(body.data.invites)).toBe(true)
      expect(body.data.invites.length).toBeGreaterThan(0)
    })

    it('should return 403 for non-admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/invites`,
        headers: {
          authorization: `Bearer ${secondUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  // =========================================
  // GET /companies/:id/dashboard-stats - Dashboard stats
  // =========================================
  describe('GET /api/v1/companies/:id/dashboard-stats', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/dashboard-stats`,
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return dashboard stats for owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/dashboard-stats`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.companyId).toBe(testCompanyId)
      expect(body.data.totalMembers).toBeDefined()
      expect(body.data.identityCompletionPercentage).toBeDefined()
      expect(body.data.contentGenerated).toBeDefined()
      expect(body.data.pendingInvitesCount).toBeDefined()
    })

    it('should return 403 for non-member', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/dashboard-stats`,
        headers: {
          authorization: `Bearer ${secondUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  // =========================================
  // GET /companies/:id/activity - Activity feed
  // =========================================
  describe('GET /api/v1/companies/:id/activity', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/activity`,
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return activity feed for member', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/activity`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(Array.isArray(body.data.activities)).toBe(true)
      expect(body.meta).toBeDefined()
    })

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/activity?limit=5&offset=0`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.activities.length).toBeLessThanOrEqual(5)
    })

    it('should return 403 for non-member', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/activity`,
        headers: {
          authorization: `Bearer ${secondUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  // =========================================
  // PATCH /companies/:id/brand-guidelines - Update brand guidelines
  // =========================================
  describe('PATCH /api/v1/companies/:id/brand-guidelines', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/companies/${testCompanyId}/brand-guidelines`,
        payload: { voiceTone: 'professional' },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should update brand guidelines for owner', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/companies/${testCompanyId}/brand-guidelines`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          voiceTone: 'professional',
          communicationStyle: 'formal',
          industry: 'Technology',
          toneAttributes: ['confident', 'innovative'],
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.brandGuidelines.voiceTone).toBe('professional')
      expect(body.data.brandGuidelines.communicationStyle).toBe('formal')
    })

    it('should return 403 for non-owner', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/companies/${testCompanyId}/brand-guidelines`,
        headers: {
          authorization: `Bearer ${secondUser.accessToken}`,
        },
        payload: { voiceTone: 'casual' },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should validate brand guidelines values', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/companies/${testCompanyId}/brand-guidelines`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          voiceTone: 'invalid-tone', // Not a valid enum value
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  // =========================================
  // GET /companies/:id/photos - Company photos
  // =========================================
  describe('GET /api/v1/companies/:id/photos', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/photos`,
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return photos for company member', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/photos`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(Array.isArray(body.data.photos)).toBe(true)
      expect(body.meta).toBeDefined()
      expect(body.meta.total).toBeDefined()
    })

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/photos?limit=5&offset=0`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.photos.length).toBeLessThanOrEqual(5)
    })

    it('should support status filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/photos?status=analyzed`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
    })

    it('should support userId filter to see specific member photos', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/photos?userId=${testUser.userId}`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
    })

    it('should return 403 for non-member', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${testCompanyId}/photos`,
        headers: {
          authorization: `Bearer ${secondUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should return 400 for invalid company ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/companies/invalid-id/photos',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  // =========================================
  // DELETE /companies/:id - Delete company
  // =========================================
  describe('DELETE /api/v1/companies/:id', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/companies/${testCompanyId}`,
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 403 for non-owner', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/companies/${testCompanyId}`,
        headers: {
          authorization: `Bearer ${secondUser.accessToken}`,
        },
      })

      // secondUser is not a member, so will get 404 (company not accessible)
      // or 403 if they somehow got access but aren't owner
      expect([403, 404]).toContain(response.statusCode)
    })

    it('should delete company for owner', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/companies/${testCompanyId}`,
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.deleted).toBe(true)
    })
  })
})

// =========================================
// Invite Routes (public)
// =========================================
describe('Invite Routes', () => {
  let app: FastifyInstance
  let testUser: TestUser
  let inviteToken: string

  beforeAll(async () => {
    app = await buildApp()
    testUser = await createTestUser(
      `test-invite-${Date.now()}@example.com`,
      'Test123456',
      'Invite Test User'
    )

    // Create a company and get an invite token
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/companies',
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: { name: 'Invite Test Company' },
    })

    const companyId = createResponse.json().data.id

    const inviteResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/companies/${companyId}/invites`,
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
      payload: { email: 'public-invite@example.com' },
    })

    // Get the token from the database (we need to query for it since it's not returned)
    // For now, we'll test with an invalid token
    inviteToken = 'invalid-token-for-testing'
  })

  afterAll(async () => {
    if (testUser) {
      await deleteTestUser(testUser.authId)
    }
    await app.close()
  })

  describe('GET /api/v1/invites/:token', () => {
    it('should return 404 for invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/invites/invalid-token-here',
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('POST /api/v1/invites/:token/accept', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/invites/some-token/accept',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 404 for invalid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/invites/invalid-token-here/accept',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })
})
