/**
 * Admin Routes
 *
 * Super Admin API endpoints for:
 * - Managing companies (create, update, assign admin)
 * - Managing users (list, view, deactivate)
 * - Managing admin users
 * - System configuration
 */

import type { FastifyInstance } from 'fastify'
import * as AdminService from '@/services/admin'
import * as InviteService from '@/services/admin/invites'
import { ApiError } from '@/utils/errors'
import { ErrorCodes, sendError, sendSuccess } from '@/utils/response'
import {
  uuidSchema,
  paginationSchema,
  createAdminSchema,
  updateAdminSchema,
  createCompanySchema,
  updateCompanySchema,
  assignAdminSchema,
  userListQuerySchema,
  userActionSchema,
  createInviteTokenSchema,
  updateCompanyEmployeeSchema,
} from './schemas'

/**
 * Super Admin authentication hook
 * Verifies user is a Super Admin before allowing access
 */
async function requireSuperAdmin(request: any, reply: any) {
  if (!request.user) {
    return sendError(reply, ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
  }

  const isSuperAdmin = await AdminService.isSuperAdmin(request.user.id)
  if (!isSuperAdmin) {
    return sendError(reply, ErrorCodes.FORBIDDEN, 'Super Admin access required', 403)
  }
}

/**
 * Admin authentication hook (any admin role)
 */
async function requireAdmin(request: any, reply: any) {
  if (!request.user) {
    return sendError(reply, ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
  }

  const isAdmin = await AdminService.isAdmin(request.user.id)
  if (!isAdmin) {
    return sendError(reply, ErrorCodes.FORBIDDEN, 'Admin access required', 403)
  }
}

export async function adminRoutes(fastify: FastifyInstance) {
  // =========================================
  // Admin User Management
  // =========================================

  /**
   * GET /admin/me - Get current admin info
   */
  fastify.get('/me', { preHandler: [fastify.authenticate, requireAdmin] }, async (request, reply) => {
    try {
      const admin = await AdminService.getAdminByUserId(request.user!.id)
      if (!admin) {
        return sendError(reply, ErrorCodes.NOT_FOUND, 'Admin not found', 404)
      }

      return sendSuccess(reply, {
        id: admin.id,
        role: admin.role,
        permissions: admin.permissions,
        lastLoginAt: admin.lastLoginAt,
      })
    } catch (error) {
      fastify.log.error(error, 'Get admin me error')
      return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to get admin info', 500)
    }
  })

  /**
   * GET /admin/admins - List all admins
   */
  fastify.get<{ Querystring: Record<string, string> }>(
    '/admins',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const queryResult = paginationSchema.safeParse(request.query)
      const query = queryResult.success ? queryResult.data : { limit: 50, offset: 0 }

      try {
        const { admins, total } = await AdminService.listAdmins(query)

        return sendSuccess(
          reply,
          {
            admins: admins.map((admin) => ({
              id: admin.id,
              userId: admin.userId,
              email: admin.user?.email,
              fullName: admin.user?.fullName,
              role: admin.role,
              isActive: admin.isActive,
              lastLoginAt: admin.lastLoginAt,
              createdAt: admin.createdAt,
            })),
          },
          200,
          { total, limit: query.limit, offset: query.offset }
        )
      } catch (error) {
        fastify.log.error(error, 'List admins error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to list admins', 500)
      }
    }
  )

  /**
   * POST /admin/admins - Create admin user
   */
  fastify.post<{ Body: unknown }>(
    '/admins',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const bodyResult = createAdminSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid request body', 400, {
          errors: bodyResult.error.flatten().fieldErrors,
        })
      }

      try {
        const admin = await AdminService.createAdminUser(
          bodyResult.data.userId,
          bodyResult.data.role,
          request.user!.id
        )

        return sendSuccess(
          reply,
          {
            id: admin.id,
            userId: admin.userId,
            role: admin.role,
            permissions: admin.permissions,
          },
          201
        )
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Create admin error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to create admin', 500)
      }
    }
  )

  /**
   * PATCH /admin/admins/:id - Update admin role
   */
  fastify.patch<{ Params: { id: string }; Body: unknown }>(
    '/admins/:id',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid admin ID', 400)
      }

      const bodyResult = updateAdminSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid request body', 400)
      }

      try {
        const admin = await AdminService.updateAdminRole(idResult.data, bodyResult.data.role)

        return sendSuccess(reply, {
          id: admin.id,
          role: admin.role,
          permissions: admin.permissions,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Update admin error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to update admin', 500)
      }
    }
  )

  /**
   * DELETE /admin/admins/:id - Deactivate admin
   */
  fastify.delete<{ Params: { id: string } }>(
    '/admins/:id',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid admin ID', 400)
      }

      try {
        await AdminService.deactivateAdmin(idResult.data)
        return sendSuccess(reply, { deactivated: true })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Deactivate admin error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to deactivate admin', 500)
      }
    }
  )

  // =========================================
  // Company Management
  // =========================================

  /**
   * GET /admin/companies - List all companies
   */
  fastify.get<{ Querystring: Record<string, string> }>(
    '/companies',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const queryResult = paginationSchema.safeParse(request.query)
      const query = queryResult.success ? queryResult.data : { limit: 50, offset: 0 }

      try {
        const { companies, total } = await AdminService.listAllCompanies(query)

        return sendSuccess(
          reply,
          {
            companies: companies.map((company) => ({
              id: company.id,
              name: company.name,
              slug: company.slug,
              domain: company.domain,
              logoUrl: company.logoUrl,
              ownerEmail: company.ownerEmail,
              memberCount: company.memberCount,
              subscriptionTier: company.subscriptionTier,
              subscriptionStatus: company.subscriptionStatus,
              isActive: company.isActive,
              createdAt: company.createdAt,
            })),
          },
          200,
          { total, limit: query.limit, offset: query.offset }
        )
      } catch (error) {
        fastify.log.error(error, 'List companies error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to list companies', 500)
      }
    }
  )

  /**
   * POST /admin/companies - Create company
   */
  fastify.post<{ Body: unknown }>(
    '/companies',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const bodyResult = createCompanySchema.safeParse(request.body)
      if (!bodyResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid request body', 400, {
          errors: bodyResult.error.flatten().fieldErrors,
        })
      }

      try {
        const company = await AdminService.createCompanyAsAdmin(
          {
            name: bodyResult.data.name,
            slug: bodyResult.data.slug,
            domain: bodyResult.data.domain,
            logoUrl: bodyResult.data.logoUrl,
          },
          bodyResult.data.ownerId
        )

        return sendSuccess(
          reply,
          {
            id: company.id,
            name: company.name,
            slug: company.slug,
            domain: company.domain,
            ownerId: company.ownerId,
            createdAt: company.createdAt,
          },
          201
        )
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Create company error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to create company', 500)
      }
    }
  )

  /**
   * PATCH /admin/companies/:id - Update company
   */
  fastify.patch<{ Params: { id: string }; Body: unknown }>(
    '/companies/:id',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid company ID', 400)
      }

      const bodyResult = updateCompanySchema.safeParse(request.body)
      if (!bodyResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid request body', 400, {
          errors: bodyResult.error.flatten().fieldErrors,
        })
      }

      try {
        const company = await AdminService.updateCompanyAsAdmin(idResult.data, bodyResult.data)

        return sendSuccess(reply, {
          id: company.id,
          name: company.name,
          slug: company.slug,
          domain: company.domain,
          subscriptionTier: company.subscriptionTier,
          subscriptionStatus: company.subscriptionStatus,
          isActive: company.isActive,
          updatedAt: company.updatedAt,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Update company error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to update company', 500)
      }
    }
  )

  /**
   * POST /admin/companies/:id/admin - Assign Company Admin
   */
  fastify.post<{ Params: { id: string }; Body: unknown }>(
    '/companies/:id/admin',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid company ID', 400)
      }

      const bodyResult = assignAdminSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid request body', 400)
      }

      try {
        await AdminService.assignCompanyAdmin(idResult.data, bodyResult.data.userId)

        return sendSuccess(reply, {
          companyId: idResult.data,
          userId: bodyResult.data.userId,
          role: 'admin',
          assigned: true,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Assign company admin error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to assign company admin', 500)
      }
    }
  )

  /**
   * GET /admin/companies/:id/employees - List company employees
   */
  fastify.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/companies/:id/employees',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid company ID', 400)
      }

      const queryResult = paginationSchema.safeParse(request.query)
      const query = queryResult.success ? queryResult.data : { limit: 50, offset: 0 }

      try {
        const { employees, total } = await AdminService.listCompanyEmployees(idResult.data, query)

        return sendSuccess(
          reply,
          {
            employees: employees.map((emp) => ({
              id: emp.id,
              userId: emp.userId,
              email: emp.user?.email,
              fullName: emp.user?.fullName,
              avatarUrl: emp.user?.avatarUrl,
              role: emp.role,
              department: emp.department,
              title: emp.title,
              isActive: emp.isActive,
              joinedAt: emp.joinedAt,
              createdAt: emp.createdAt,
            })),
          },
          200,
          { total, limit: query.limit, offset: query.offset }
        )
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'List company employees error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to list company employees', 500)
      }
    }
  )

  /**
   * PATCH /admin/companies/:id/employees/:userId - Update company employee
   */
  fastify.patch<{ Params: { id: string; userId: string }; Body: unknown }>(
    '/companies/:id/employees/:userId',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const companyIdResult = uuidSchema.safeParse(request.params.id)
      if (!companyIdResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid company ID', 400)
      }

      const userIdResult = uuidSchema.safeParse(request.params.userId)
      if (!userIdResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid user ID', 400)
      }

      const bodyResult = updateCompanyEmployeeSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid request body', 400, {
          errors: bodyResult.error.flatten().fieldErrors,
        })
      }

      try {
        const employee = await AdminService.updateCompanyEmployee(
          companyIdResult.data,
          userIdResult.data,
          bodyResult.data
        )

        return sendSuccess(reply, {
          id: employee.id,
          userId: employee.userId,
          role: employee.role,
          isActive: employee.isActive,
          updatedAt: employee.updatedAt,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Update company employee error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to update company employee', 500)
      }
    }
  )

  /**
   * DELETE /admin/companies/:id/employees/:userId - Remove company employee
   */
  fastify.delete<{ Params: { id: string; userId: string } }>(
    '/companies/:id/employees/:userId',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const companyIdResult = uuidSchema.safeParse(request.params.id)
      if (!companyIdResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid company ID', 400)
      }

      const userIdResult = uuidSchema.safeParse(request.params.userId)
      if (!userIdResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid user ID', 400)
      }

      try {
        await AdminService.removeCompanyEmployee(companyIdResult.data, userIdResult.data)
        return sendSuccess(reply, { removed: true })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Remove company employee error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to remove company employee', 500)
      }
    }
  )

  /**
   * GET /admin/companies/:id/invites - List company invites
   */
  fastify.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/companies/:id/invites',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid company ID', 400)
      }

      const queryResult = paginationSchema.safeParse(request.query)
      const query = queryResult.success ? queryResult.data : { limit: 50, offset: 0 }

      try {
        const { invites, total } = await AdminService.listCompanyInvites(idResult.data, {
          ...query,
          status: request.query.status,
        })

        return sendSuccess(
          reply,
          {
            invites: invites.map((invite) => ({
              id: invite.id,
              email: invite.email,
              role: invite.role,
              token: invite.token,
              status: invite.status,
              expiresAt: invite.expiresAt,
              createdAt: invite.createdAt,
            })),
          },
          200,
          { total, limit: query.limit, offset: query.offset }
        )
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'List company invites error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to list company invites', 500)
      }
    }
  )

  /**
   * DELETE /admin/companies/:id/invites/:inviteId - Revoke company invite
   */
  fastify.delete<{ Params: { id: string; inviteId: string } }>(
    '/companies/:id/invites/:inviteId',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const companyIdResult = uuidSchema.safeParse(request.params.id)
      if (!companyIdResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid company ID', 400)
      }

      const inviteIdResult = uuidSchema.safeParse(request.params.inviteId)
      if (!inviteIdResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid invite ID', 400)
      }

      try {
        await AdminService.revokeCompanyInvite(companyIdResult.data, inviteIdResult.data)
        return sendSuccess(reply, { revoked: true })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Revoke company invite error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to revoke company invite', 500)
      }
    }
  )

  // =========================================
  // User Management
  // =========================================

  /**
   * GET /admin/users - List all users
   */
  fastify.get<{ Querystring: Record<string, string> }>(
    '/users',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const queryResult = userListQuerySchema.safeParse(request.query)
      const query = queryResult.success ? queryResult.data : { limit: 50, offset: 0 }

      try {
        const { users, total } = await AdminService.listAllUsers(query)

        return sendSuccess(
          reply,
          {
            users: users.map((user) => ({
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              avatarUrl: user.avatarUrl,
              accountType: user.accountType,
              companyId: user.companyId,
              isActive: user.isActive,
              createdAt: user.createdAt,
            })),
          },
          200,
          { total, limit: query.limit, offset: query.offset }
        )
      } catch (error) {
        fastify.log.error(error, 'List users error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to list users', 500)
      }
    }
  )

  /**
   * GET /admin/users/:id - Get user details
   */
  fastify.get<{ Params: { id: string } }>(
    '/users/:id',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid user ID', 400)
      }

      try {
        const details = await AdminService.getUserDetails(idResult.data)

        return sendSuccess(reply, {
          user: {
            id: details.user.id,
            email: details.user.email,
            fullName: details.user.fullName,
            avatarUrl: details.user.avatarUrl,
            accountType: details.user.accountType,
            isActive: details.user.isActive,
            createdAt: details.user.createdAt,
          },
          identityBrain: details.identityBrain,
          company: details.company,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Get user details error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to get user details', 500)
      }
    }
  )

  /**
   * POST /admin/users/:id/action - Perform action on user
   */
  fastify.post<{ Params: { id: string }; Body: unknown }>(
    '/users/:id/action',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid user ID', 400)
      }

      const bodyResult = userActionSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid action', 400)
      }

      try {
        if (bodyResult.data.action === 'deactivate') {
          await AdminService.deactivateUser(idResult.data)
        } else if (bodyResult.data.action === 'reactivate') {
          await AdminService.reactivateUser(idResult.data)
        }

        return sendSuccess(reply, {
          userId: idResult.data,
          action: bodyResult.data.action,
          success: true,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'User action error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to perform action', 500)
      }
    }
  )

  // =========================================
  // Dashboard Stats
  // =========================================

  /**
   * GET /admin/stats - Get dashboard statistics
   */
  fastify.get('/stats', { preHandler: [fastify.authenticate, requireAdmin] }, async (_request, reply) => {
    try {
      const { total: totalUsers } = await AdminService.listAllUsers({ limit: 1 })
      const { total: totalCompanies } = await AdminService.listAllCompanies({ limit: 1 })
      const { total: totalAdmins } = await AdminService.listAdmins({ limit: 1 })

      return sendSuccess(reply, {
        totalUsers,
        totalCompanies,
        totalAdmins,
      })
    } catch (error) {
      fastify.log.error(error, 'Get stats error')
      return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to get stats', 500)
    }
  })

  // =========================================
  // Invite Token Management
  // =========================================

  /**
   * GET /admin/invites - List signup invite tokens
   */
  fastify.get<{ Querystring: Record<string, string> }>(
    '/invites',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const queryResult = paginationSchema.safeParse(request.query)
      const query = queryResult.success ? queryResult.data : { limit: 50, offset: 0 }

      try {
        const { invites, total } = await InviteService.listInviteTokens({
          limit: query.limit,
          offset: query.offset,
          includeExpired: request.query.includeExpired === 'true',
        })

        return sendSuccess(
          reply,
          {
            invites: invites.map((invite) => ({
              id: invite.id,
              token: invite.token,
              email: invite.email,
              maxUses: parseInt(invite.maxUses, 10),
              usedCount: parseInt(invite.usedCount, 10),
              expiresAt: invite.expiresAt,
              note: invite.note,
              isActive: invite.isActive,
              createdAt: invite.createdAt,
            })),
            inviteOnlyEnabled: InviteService.isInviteOnlyEnabled(),
          },
          200,
          { total, limit: query.limit, offset: query.offset }
        )
      } catch (error) {
        fastify.log.error(error, 'List invite tokens error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to list invite tokens', 500)
      }
    }
  )

  /**
   * POST /admin/invites - Create signup invite token
   */
  fastify.post<{ Body: unknown }>(
    '/invites',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const bodyResult = createInviteTokenSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid request body', 400, {
          errors: bodyResult.error.flatten().fieldErrors,
        })
      }

      try {
        // Get admin ID for tracking
        const admin = await AdminService.getAdminByUserId(request.user!.id)

        const invite = await InviteService.createInviteToken({
          email: bodyResult.data.email,
          maxUses: bodyResult.data.maxUses,
          expiresInDays: bodyResult.data.expiresInDays,
          note: bodyResult.data.note,
          createdBy: admin?.id,
        })

        return sendSuccess(
          reply,
          {
            id: invite.id,
            token: invite.token,
            email: invite.email,
            maxUses: parseInt(invite.maxUses, 10),
            expiresAt: invite.expiresAt,
            note: invite.note,
            // Include signup URL for convenience
            signupUrl: `${process.env.FRONTEND_URL || 'https://youos.app'}/signup?invite=${invite.token}`,
          },
          201
        )
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Create invite token error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to create invite token', 500)
      }
    }
  )

  /**
   * DELETE /admin/invites/:id - Revoke invite token
   */
  fastify.delete<{ Params: { id: string } }>(
    '/invites/:id',
    { preHandler: [fastify.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid invite ID', 400)
      }

      try {
        await InviteService.revokeInviteToken(idResult.data)
        return sendSuccess(reply, { revoked: true })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Revoke invite token error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to revoke invite token', 500)
      }
    }
  )

  /**
   * GET /admin/settings/invite-only - Check invite-only status
   */
  fastify.get('/settings/invite-only', { preHandler: [fastify.authenticate, requireAdmin] }, async (_request, reply) => {
    return sendSuccess(reply, {
      enabled: InviteService.isInviteOnlyEnabled(),
      envVariable: 'INVITE_ONLY_REGISTRATION',
      note: 'Set INVITE_ONLY_REGISTRATION=true in environment to enable invite-only registration',
    })
  })
}
