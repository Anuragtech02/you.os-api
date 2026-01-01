/**
 * Company Routes
 *
 * API endpoints for company management, employees, and invites.
 */

import type { FastifyInstance } from 'fastify'
import * as CompanyService from '@/services/companies'
import { ApiError } from '@/utils/errors'
import { ErrorCodes, sendError, sendSuccess } from '@/utils/response'
import {
  createCompanySchema,
  updateCompanySchema,
  updateEmployeeSchema,
  createInviteSchema,
  paginationSchema,
  uuidSchema,
  inviteListSchema,
  transferOwnershipSchema,
  brandGuidelinesSchema,
  activityFeedQuerySchema,
} from './schemas'

export async function companyRoutes(fastify: FastifyInstance) {
  // =========================================
  // Company CRUD
  // =========================================

  /**
   * POST /companies - Create a new company
   */
  fastify.post<{ Body: unknown }>(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodyResult = createCompanySchema.safeParse(request.body)
      if (!bodyResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid request body', 400, {
          errors: bodyResult.error.flatten().fieldErrors,
        })
      }

      try {
        const company = await CompanyService.createCompany(request.user!.id, bodyResult.data)

        return sendSuccess(
          reply,
          {
            id: company.id,
            name: company.name,
            slug: company.slug,
            domain: company.domain,
            logoUrl: company.logoUrl,
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
   * GET /companies - List user's companies
   */
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const companies = await CompanyService.getUserCompanies(request.user!.id)

        return sendSuccess(reply, {
          companies: companies.map((company) => ({
            id: company.id,
            name: company.name,
            slug: company.slug,
            domain: company.domain,
            logoUrl: company.logoUrl,
            isOwner: company.ownerId === request.user!.id,
          })),
        })
      } catch (error) {
        fastify.log.error(error, 'List companies error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to list companies', 500)
      }
    }
  )

  /**
   * GET /companies/:id - Get company details
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid company ID', 400)
      }

      try {
        // Check if user has access
        const userRole = await CompanyService.getUserRoleInCompany(request.user!.id, idResult.data)
        if (!userRole) {
          return sendError(reply, ErrorCodes.FORBIDDEN, 'You do not have access to this company', 403)
        }

        const company = await CompanyService.getCompanyById(idResult.data)
        if (!company) {
          return sendError(reply, ErrorCodes.NOT_FOUND, 'Company not found', 404)
        }

        return sendSuccess(reply, {
          id: company.id,
          name: company.name,
          slug: company.slug,
          domain: company.domain,
          logoUrl: company.logoUrl,
          brandColors: company.brandColors,
          brandGuidelines: company.brandGuidelines,
          settings: company.settings,
          subscriptionTier: company.subscriptionTier,
          subscriptionStatus: company.subscriptionStatus,
          isOwner: userRole.isOwner,
          role: userRole.role,
          createdAt: company.createdAt,
        })
      } catch (error) {
        fastify.log.error(error, 'Get company error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to get company', 500)
      }
    }
  )

  /**
   * PATCH /companies/:id - Update company
   */
  fastify.patch<{ Params: { id: string }; Body: unknown }>(
    '/:id',
    { preHandler: [fastify.authenticate] },
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
        // Check if user can manage
        const canManage = await CompanyService.canUserManageCompany(request.user!.id, idResult.data)
        if (!canManage) {
          return sendError(reply, ErrorCodes.FORBIDDEN, 'You do not have permission to update this company', 403)
        }

        const company = await CompanyService.updateCompany(idResult.data, bodyResult.data)

        return sendSuccess(reply, {
          id: company.id,
          name: company.name,
          slug: company.slug,
          domain: company.domain,
          logoUrl: company.logoUrl,
          brandColors: company.brandColors,
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
   * DELETE /companies/:id - Delete company
   */
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid company ID', 400)
      }

      try {
        // Only owner can delete
        const company = await CompanyService.getCompanyById(idResult.data)
        if (!company) {
          return sendError(reply, ErrorCodes.NOT_FOUND, 'Company not found', 404)
        }

        if (company.ownerId !== request.user!.id) {
          return sendError(reply, ErrorCodes.FORBIDDEN, 'Only the owner can delete a company', 403)
        }

        await CompanyService.deleteCompany(idResult.data)

        return sendSuccess(reply, { deleted: true })
      } catch (error) {
        fastify.log.error(error, 'Delete company error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to delete company', 500)
      }
    }
  )

  // =========================================
  // Employees
  // =========================================

  /**
   * GET /companies/:id/employees - List employees
   */
  fastify.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/:id/employees',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid company ID', 400)
      }

      const queryResult = paginationSchema.safeParse(request.query)
      const query = queryResult.success ? queryResult.data : { limit: 20, offset: 0 }

      try {
        // Check access
        const userRole = await CompanyService.getUserRoleInCompany(request.user!.id, idResult.data)
        if (!userRole) {
          return sendError(reply, ErrorCodes.FORBIDDEN, 'You do not have access to this company', 403)
        }

        const { employees, total } = await CompanyService.listEmployees(idResult.data, query)

        return sendSuccess(
          reply,
          { employees },
          200,
          {
            total,
            limit: query.limit,
            offset: query.offset,
            hasMore: query.offset + employees.length < total,
          }
        )
      } catch (error) {
        fastify.log.error(error, 'List employees error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to list employees', 500)
      }
    }
  )

  /**
   * PATCH /companies/:id/employees/:userId - Update employee
   */
  fastify.patch<{ Params: { id: string; userId: string }; Body: unknown }>(
    '/:id/employees/:userId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const companyIdResult = uuidSchema.safeParse(request.params.id)
      const userIdResult = uuidSchema.safeParse(request.params.userId)

      if (!companyIdResult.success || !userIdResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid ID', 400)
      }

      const bodyResult = updateEmployeeSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid request body', 400, {
          errors: bodyResult.error.flatten().fieldErrors,
        })
      }

      try {
        const canManage = await CompanyService.canUserManageCompany(request.user!.id, companyIdResult.data)
        if (!canManage) {
          return sendError(reply, ErrorCodes.FORBIDDEN, 'You do not have permission to manage employees', 403)
        }

        const employee = await CompanyService.updateEmployee(
          companyIdResult.data,
          userIdResult.data,
          bodyResult.data
        )

        return sendSuccess(reply, {
          id: employee.id,
          userId: employee.userId,
          role: employee.role,
          department: employee.department,
          title: employee.title,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Update employee error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to update employee', 500)
      }
    }
  )

  /**
   * DELETE /companies/:id/employees/:userId - Remove employee
   */
  fastify.delete<{ Params: { id: string; userId: string } }>(
    '/:id/employees/:userId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const companyIdResult = uuidSchema.safeParse(request.params.id)
      const userIdResult = uuidSchema.safeParse(request.params.userId)

      if (!companyIdResult.success || !userIdResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid ID', 400)
      }

      try {
        const canManage = await CompanyService.canUserManageCompany(request.user!.id, companyIdResult.data)
        if (!canManage) {
          return sendError(reply, ErrorCodes.FORBIDDEN, 'You do not have permission to remove employees', 403)
        }

        await CompanyService.removeEmployee(companyIdResult.data, userIdResult.data)

        return sendSuccess(reply, { removed: true })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Remove employee error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to remove employee', 500)
      }
    }
  )

  /**
   * POST /companies/:id/transfer-ownership - Transfer ownership
   */
  fastify.post<{ Params: { id: string }; Body: unknown }>(
    '/:id/transfer-ownership',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid company ID', 400)
      }

      const bodyResult = transferOwnershipSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid request body', 400)
      }

      try {
        await CompanyService.transferOwnership(idResult.data, request.user!.id, bodyResult.data.newOwnerId)

        return sendSuccess(reply, { transferred: true })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Transfer ownership error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to transfer ownership', 500)
      }
    }
  )

  // =========================================
  // Invites
  // =========================================

  /**
   * POST /companies/:id/invites - Send invite
   */
  fastify.post<{ Params: { id: string }; Body: unknown }>(
    '/:id/invites',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid company ID', 400)
      }

      const bodyResult = createInviteSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid request body', 400, {
          errors: bodyResult.error.flatten().fieldErrors,
        })
      }

      try {
        const canManage = await CompanyService.canUserManageCompany(request.user!.id, idResult.data)
        if (!canManage) {
          return sendError(reply, ErrorCodes.FORBIDDEN, 'You do not have permission to send invites', 403)
        }

        const invite = await CompanyService.sendInvite(idResult.data, request.user!.id, bodyResult.data)

        return sendSuccess(
          reply,
          {
            id: invite.id,
            email: invite.email,
            role: invite.role,
            expiresAt: invite.expiresAt,
          },
          201
        )
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Send invite error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to send invite', 500)
      }
    }
  )

  /**
   * GET /companies/:id/invites - List invites
   */
  fastify.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/:id/invites',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid company ID', 400)
      }

      const queryResult = inviteListSchema.safeParse(request.query)
      const query = queryResult.success ? queryResult.data : { limit: 50, offset: 0 }

      try {
        const canManage = await CompanyService.canUserManageCompany(request.user!.id, idResult.data)
        if (!canManage) {
          return sendError(reply, ErrorCodes.FORBIDDEN, 'You do not have permission to view invites', 403)
        }

        const { invites, total } = await CompanyService.listInvites(idResult.data, query)

        return sendSuccess(
          reply,
          {
            invites: invites.map((inv) => ({
              id: inv.id,
              email: inv.email,
              role: inv.role,
              status: inv.status,
              token: inv.token,
              expiresAt: inv.expiresAt,
              invitedBy: inv.inviterName || 'Unknown',
              createdAt: inv.createdAt,
            })),
          },
          200,
          {
            total,
            limit: query.limit,
            offset: query.offset,
            hasMore: query.offset + invites.length < total,
          }
        )
      } catch (error) {
        fastify.log.error(error, 'List invites error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to list invites', 500)
      }
    }
  )

  /**
   * DELETE /companies/:id/invites/:inviteId - Revoke invite
   */
  fastify.delete<{ Params: { id: string; inviteId: string } }>(
    '/:id/invites/:inviteId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const companyIdResult = uuidSchema.safeParse(request.params.id)
      const inviteIdResult = uuidSchema.safeParse(request.params.inviteId)

      if (!companyIdResult.success || !inviteIdResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid ID', 400)
      }

      try {
        const canManage = await CompanyService.canUserManageCompany(request.user!.id, companyIdResult.data)
        if (!canManage) {
          return sendError(reply, ErrorCodes.FORBIDDEN, 'You do not have permission to revoke invites', 403)
        }

        await CompanyService.revokeInvite(companyIdResult.data, inviteIdResult.data)

        return sendSuccess(reply, { revoked: true })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Revoke invite error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to revoke invite', 500)
      }
    }
  )

  /**
   * POST /companies/:id/invites/:inviteId/resend - Resend invite
   */
  fastify.post<{ Params: { id: string; inviteId: string } }>(
    '/:id/invites/:inviteId/resend',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const companyIdResult = uuidSchema.safeParse(request.params.id)
      const inviteIdResult = uuidSchema.safeParse(request.params.inviteId)

      if (!companyIdResult.success || !inviteIdResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid ID', 400)
      }

      try {
        const canManage = await CompanyService.canUserManageCompany(request.user!.id, companyIdResult.data)
        if (!canManage) {
          return sendError(reply, ErrorCodes.FORBIDDEN, 'You do not have permission to resend invites', 403)
        }

        const invite = await CompanyService.resendInvite(companyIdResult.data, inviteIdResult.data)

        return sendSuccess(reply, {
          id: invite.id,
          email: invite.email,
          expiresAt: invite.expiresAt,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Resend invite error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to resend invite', 500)
      }
    }
  )

  // =========================================
  // Dashboard & Analytics
  // =========================================

  /**
   * GET /companies/:id/dashboard-stats - Get dashboard statistics
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id/dashboard-stats',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid company ID', 400)
      }

      try {
        // Only admins/owners can view dashboard stats
        const canManage = await CompanyService.canUserManageCompany(request.user!.id, idResult.data)
        if (!canManage) {
          return sendError(reply, ErrorCodes.FORBIDDEN, 'You do not have permission to view dashboard stats', 403)
        }

        const stats = await CompanyService.getDashboardStats(idResult.data)

        return sendSuccess(reply, stats)
      } catch (error) {
        fastify.log.error(error, 'Get dashboard stats error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to get dashboard stats', 500)
      }
    }
  )

  /**
   * GET /companies/:id/activity - Get activity feed
   */
  fastify.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/:id/activity',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid company ID', 400)
      }

      const queryResult = activityFeedQuerySchema.safeParse(request.query)
      const query = queryResult.success ? queryResult.data : { limit: 20, offset: 0 }

      try {
        // All members can view activity
        const isMember = await CompanyService.isUserMemberOfCompany(request.user!.id, idResult.data)
        if (!isMember) {
          return sendError(reply, ErrorCodes.FORBIDDEN, 'You do not have access to this company', 403)
        }

        const { activities, total } = await CompanyService.getActivityFeed(idResult.data, query)

        return sendSuccess(
          reply,
          { activities },
          200,
          {
            total,
            limit: query.limit,
            offset: query.offset,
            hasMore: query.offset + activities.length < total,
          }
        )
      } catch (error) {
        fastify.log.error(error, 'Get activity feed error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to get activity feed', 500)
      }
    }
  )

  // =========================================
  // Brand Guidelines
  // =========================================

  /**
   * PATCH /companies/:id/brand-guidelines - Update brand guidelines
   */
  fastify.patch<{ Params: { id: string }; Body: unknown }>(
    '/:id/brand-guidelines',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const idResult = uuidSchema.safeParse(request.params.id)
      if (!idResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid company ID', 400)
      }

      const bodyResult = brandGuidelinesSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return sendError(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid request body', 400, {
          errors: bodyResult.error.flatten().fieldErrors,
        })
      }

      try {
        // Only admins/owners can update brand guidelines
        const canManage = await CompanyService.canUserManageCompany(request.user!.id, idResult.data)
        if (!canManage) {
          return sendError(reply, ErrorCodes.FORBIDDEN, 'You do not have permission to update brand guidelines', 403)
        }

        const company = await CompanyService.updateBrandGuidelines(idResult.data, bodyResult.data)

        return sendSuccess(reply, {
          id: company.id,
          brandGuidelines: company.brandGuidelines,
          updatedAt: company.updatedAt,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Update brand guidelines error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to update brand guidelines', 500)
      }
    }
  )
}

/**
 * Public invite routes (no company context needed)
 */
export async function inviteRoutes(fastify: FastifyInstance) {
  /**
   * POST /invites/:token/accept - Accept an invite
   */
  fastify.post<{ Params: { token: string } }>(
    '/:token/accept',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { token } = request.params

      try {
        const { invite, companyId } = await CompanyService.acceptInvite(token, request.user!.id)

        return sendSuccess(reply, {
          companyId,
          role: invite.role,
          message: 'Successfully joined the company',
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return sendError(reply, error.code, error.message, error.statusCode)
        }
        fastify.log.error(error, 'Accept invite error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to accept invite', 500)
      }
    }
  )

  /**
   * GET /invites/:token - Get invite details (public)
   */
  fastify.get<{ Params: { token: string } }>(
    '/:token',
    async (request, reply) => {
      const { token } = request.params

      try {
        const invite = await CompanyService.getInviteByToken(token)

        if (!invite) {
          return sendError(reply, ErrorCodes.NOT_FOUND, 'Invite not found', 404)
        }

        // Check expiration
        const isExpired = new Date() > invite.expiresAt
        const status = isExpired && invite.status === 'pending' ? 'expired' : invite.status

        return sendSuccess(reply, {
          email: invite.email,
          role: invite.role,
          status,
          expiresAt: invite.expiresAt,
        })
      } catch (error) {
        fastify.log.error(error, 'Get invite error')
        return sendError(reply, ErrorCodes.INTERNAL_ERROR, 'Failed to get invite', 500)
      }
    }
  )
}
