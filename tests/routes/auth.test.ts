/**
 * Auth Routes Tests
 *
 * Tests for /api/v1/auth/* endpoints
 * Uses Fastify's inject() for request simulation (no server start needed)
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import type { FastifyInstance } from 'fastify'
import { buildApp, createTestUser, deleteTestUser, type TestUser } from '../helpers'

describe('Auth Routes', () => {
  let app: FastifyInstance
  let testUser: TestUser | null = null

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    // Cleanup test user if created
    if (testUser) {
      await deleteTestUser(testUser.authId)
    }
    await app.close()
  })

  // =========================================
  // POST /auth/register
  // =========================================
  describe('POST /auth/register', () => {
    const endpoint = '/api/v1/auth/register'

    it('should register a new user successfully', async () => {
      const email = `test-register-${Date.now()}@example.com`

      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: {
          email,
          password: 'Test123456',
          fullName: 'Test Register User',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(201)
      expect(body.success).toBe(true)
      expect(body.data.user.email).toBe(email)
      expect(body.data.user.fullName).toBe('Test Register User')
      expect(body.data.session.accessToken).toBeDefined()
      expect(body.data.session.refreshToken).toBeDefined()

      // Store for cleanup
      if (body.data.user.id) {
        // Get authId for cleanup
        const loginResponse = await app.inject({
          method: 'GET',
          url: '/api/v1/auth/me',
          headers: {
            authorization: `Bearer ${body.data.session.accessToken}`,
          },
        })
        const loginBody = loginResponse.json()
        if (loginBody.data?.user?.id) {
          testUser = {
            id: body.data.user.id,
            authId: '', // We'll need to track this separately
            email,
            fullName: 'Test Register User',
            accessToken: body.data.session.accessToken,
            refreshToken: body.data.session.refreshToken,
          }
        }
      }
    })

    it('should reject registration with invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: {
          email: 'not-an-email',
          password: 'Test123456',
          fullName: 'Test User',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(400)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject registration with weak password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: {
          email: 'test@example.com',
          password: 'weak',
          fullName: 'Test User',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(400)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject registration with password missing uppercase', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: {
          email: 'test@example.com',
          password: 'test123456',
          fullName: 'Test User',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(400)
      expect(body.success).toBe(false)
    })

    it('should reject registration with password missing number', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: {
          email: 'test@example.com',
          password: 'TestPassword',
          fullName: 'Test User',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(400)
      expect(body.success).toBe(false)
    })

    it('should reject registration with short name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: {
          email: 'test@example.com',
          password: 'Test123456',
          fullName: 'A',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(400)
      expect(body.success).toBe(false)
    })

    it('should reject registration with missing fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: {
          email: 'test@example.com',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(400)
      expect(body.success).toBe(false)
    })
  })

  // =========================================
  // POST /auth/login
  // =========================================
  describe('POST /auth/login', () => {
    const endpoint = '/api/v1/auth/login'
    let loginTestUser: TestUser

    beforeAll(async () => {
      // Create a user for login tests
      loginTestUser = await createTestUser(
        `test-login-${Date.now()}@example.com`,
        'Test123456',
        'Login Test User'
      )
    })

    afterAll(async () => {
      if (loginTestUser) {
        await deleteTestUser(loginTestUser.authId)
      }
    })

    it('should login successfully with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: {
          email: loginTestUser.email,
          password: 'Test123456',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.user.email).toBe(loginTestUser.email)
      expect(body.data.session.accessToken).toBeDefined()
      expect(body.data.session.refreshToken).toBeDefined()
    })

    it('should reject login with wrong password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: {
          email: loginTestUser.email,
          password: 'WrongPassword123',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(401)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('UNAUTHORIZED')
    })

    it('should reject login with non-existent email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: {
          email: 'nonexistent@example.com',
          password: 'Test123456',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(401)
      expect(body.success).toBe(false)
    })

    it('should reject login with invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: {
          email: 'not-an-email',
          password: 'Test123456',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(400)
      expect(body.success).toBe(false)
    })
  })

  // =========================================
  // GET /auth/me
  // =========================================
  describe('GET /auth/me', () => {
    const endpoint = '/api/v1/auth/me'
    let meTestUser: TestUser

    beforeAll(async () => {
      meTestUser = await createTestUser(
        `test-me-${Date.now()}@example.com`,
        'Test123456',
        'Me Test User'
      )
    })

    afterAll(async () => {
      if (meTestUser) {
        await deleteTestUser(meTestUser.authId)
      }
    })

    it('should return current user with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: endpoint,
        headers: {
          authorization: `Bearer ${meTestUser.accessToken}`,
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.user.email).toBe(meTestUser.email)
      expect(body.data.user.fullName).toBe(meTestUser.fullName)
    })

    it('should reject request without auth header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: endpoint,
      })

      const body = response.json()

      expect(response.statusCode).toBe(401)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('UNAUTHORIZED')
    })

    it('should reject request with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: endpoint,
        headers: {
          authorization: 'Bearer invalid-token',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(401)
      expect(body.success).toBe(false)
    })

    it('should reject request with malformed auth header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: endpoint,
        headers: {
          authorization: 'NotBearer token',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(401)
      expect(body.success).toBe(false)
    })
  })

  // =========================================
  // PATCH /auth/me
  // =========================================
  describe('PATCH /auth/me', () => {
    const endpoint = '/api/v1/auth/me'
    let patchTestUser: TestUser

    beforeAll(async () => {
      patchTestUser = await createTestUser(
        `test-patch-${Date.now()}@example.com`,
        'Test123456',
        'Patch Test User'
      )
    })

    afterAll(async () => {
      if (patchTestUser) {
        await deleteTestUser(patchTestUser.authId)
      }
    })

    it('should update user profile successfully', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: endpoint,
        headers: {
          authorization: `Bearer ${patchTestUser.accessToken}`,
        },
        payload: {
          fullName: 'Updated Name',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.user.fullName).toBe('Updated Name')
    })

    it('should update preferences', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: endpoint,
        headers: {
          authorization: `Bearer ${patchTestUser.accessToken}`,
        },
        payload: {
          preferences: { theme: 'dark', notifications: true },
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.user.preferences).toEqual({ theme: 'dark', notifications: true })
    })

    it('should reject update without auth', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: endpoint,
        payload: {
          fullName: 'New Name',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(401)
      expect(body.success).toBe(false)
    })

    it('should reject update with invalid full name', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: endpoint,
        headers: {
          authorization: `Bearer ${patchTestUser.accessToken}`,
        },
        payload: {
          fullName: 'A', // Too short
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(400)
      expect(body.success).toBe(false)
    })
  })

  // =========================================
  // POST /auth/refresh
  // =========================================
  describe('POST /auth/refresh', () => {
    const endpoint = '/api/v1/auth/refresh'
    let refreshTestUser: TestUser

    beforeAll(async () => {
      refreshTestUser = await createTestUser(
        `test-refresh-${Date.now()}@example.com`,
        'Test123456',
        'Refresh Test User'
      )
    })

    afterAll(async () => {
      if (refreshTestUser) {
        await deleteTestUser(refreshTestUser.authId)
      }
    })

    it('should refresh token successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: {
          refreshToken: refreshTestUser.refreshToken,
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.session.accessToken).toBeDefined()
      expect(body.data.session.refreshToken).toBeDefined()
    })

    it('should reject with missing refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: {},
      })

      const body = response.json()

      expect(response.statusCode).toBe(400)
      expect(body.success).toBe(false)
    })

    it('should reject with invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: {
          refreshToken: 'invalid-refresh-token',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(401)
      expect(body.success).toBe(false)
    })
  })

  // =========================================
  // POST /auth/change-password
  // =========================================
  describe('POST /auth/change-password', () => {
    const endpoint = '/api/v1/auth/change-password'
    let changePasswordUser: TestUser

    beforeAll(async () => {
      changePasswordUser = await createTestUser(
        `test-change-password-${Date.now()}@example.com`,
        'Test123456',
        'Change Password Test User'
      )
    })

    afterAll(async () => {
      if (changePasswordUser) {
        await deleteTestUser(changePasswordUser.authId)
      }
    })

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: {
          currentPassword: 'Test123456',
          newPassword: 'NewTest123456',
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should reject with incorrect current password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        headers: {
          authorization: `Bearer ${changePasswordUser.accessToken}`,
        },
        payload: {
          currentPassword: 'WrongPassword123',
          newPassword: 'NewTest123456',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(401)
      expect(body.success).toBe(false)
    })

    it('should reject weak new password (too short)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        headers: {
          authorization: `Bearer ${changePasswordUser.accessToken}`,
        },
        payload: {
          currentPassword: 'Test123456',
          newPassword: 'Aa1',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(400)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject new password missing uppercase', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        headers: {
          authorization: `Bearer ${changePasswordUser.accessToken}`,
        },
        payload: {
          currentPassword: 'Test123456',
          newPassword: 'newpassword123',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(400)
      expect(body.success).toBe(false)
    })

    it('should reject new password missing number', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        headers: {
          authorization: `Bearer ${changePasswordUser.accessToken}`,
        },
        payload: {
          currentPassword: 'Test123456',
          newPassword: 'NewPassword',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(400)
      expect(body.success).toBe(false)
    })

    it('should change password successfully with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        headers: {
          authorization: `Bearer ${changePasswordUser.accessToken}`,
        },
        payload: {
          currentPassword: 'Test123456',
          newPassword: 'NewTest123456',
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.message).toContain('Password changed successfully')
    })

    it('should allow login with new password', async () => {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: changePasswordUser.email,
          password: 'NewTest123456',
        },
      })

      const body = loginResponse.json()

      expect(loginResponse.statusCode).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.session.accessToken).toBeDefined()
    })
  })

  // =========================================
  // POST /auth/logout
  // =========================================
  describe('POST /auth/logout', () => {
    const endpoint = '/api/v1/auth/logout'
    let logoutTestUser: TestUser

    beforeAll(async () => {
      logoutTestUser = await createTestUser(
        `test-logout-${Date.now()}@example.com`,
        'Test123456',
        'Logout Test User'
      )
    })

    afterAll(async () => {
      if (logoutTestUser) {
        await deleteTestUser(logoutTestUser.authId)
      }
    })

    it('should logout successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        headers: {
          authorization: `Bearer ${logoutTestUser.accessToken}`,
        },
      })

      const body = response.json()

      expect(response.statusCode).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.message).toBe('Logged out successfully')
    })

    it('should reject logout without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
      })

      const body = response.json()

      expect(response.statusCode).toBe(401)
      expect(body.success).toBe(false)
    })
  })
})

// =========================================
// Health Check Test
// =========================================
describe('Health Routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      })

      const body = response.json()

      expect(response.statusCode).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.status).toBe('ok')
    })
  })
})
