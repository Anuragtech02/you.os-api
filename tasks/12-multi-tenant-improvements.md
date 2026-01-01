# Multi-Tenant Improvements Checklist

**Created:** 2026-01-01
**Status:** In Progress
**Priority:** High (Client Requested for v1 Launch)

---

## Overview

This document tracks the implementation of multi-tenant improvements requested by the client (Sarah) to make the company experience more visible and professional.

### Client Requirements Summary:
1. Change Password inside Settings (not only via login reset)
2. Clear company context after login
3. Visible company name/workspace
4. Role awareness (owner vs staff)
5. Clear path showing multi-tenant, not just individual accounts

---

## Phase 1: Quick Wins (Client Priority)

### 1.1 Change Password Endpoint
- **Status:** [x] Completed
- **Problem:** Users can only reset password via "Forgot Password" on login page. No way to change password from within the app settings.
- **Solution:** Add `POST /auth/change-password` endpoint that validates current password and updates to new password.
- **Files modified:**
  - `src/routes/auth/index.ts` - Added change-password route
  - `src/routes/auth/schemas.ts` - Added changePasswordSchema
- **Acceptance Criteria:**
  - [x] Endpoint validates current password before allowing change
  - [x] Password meets security requirements (min length, uppercase, lowercase, number)
  - [x] Returns appropriate error messages
  - [x] Works with Supabase Auth

---

## Phase 2: Schema Updates

### 2.1 Add Brand Guidelines to Companies
- **Status:** [x] Completed
- **Problem:** Companies table doesn't store brand guidelines needed for content generation context.
- **Solution:** Add `brandGuidelines` JSONB column to `companies` table.
- **Files modified:**
  - `src/db/schema/companies.ts` - Added brandGuidelines column and BrandGuidelines interface
  - Migration: `drizzle/0002_fixed_thunderball.sql`
- **Schema:**
  ```typescript
  interface BrandGuidelines {
    voiceTone?: 'professional' | 'casual' | 'technical' | 'friendly'
    toneAttributes?: string[]
    industry?: string
    targetAudience?: string
    keyMessaging?: string
    wordsToAvoid?: string[]
    wordsToInclude?: string[]
    communicationStyle?: 'formal' | 'informal' | 'balanced'
  }
  ```
- **Acceptance Criteria:**
  - [x] Migration generated successfully
  - [x] Brand guidelines can be saved and retrieved
  - [x] Existing companies not affected (nullable column)

### 2.2 Add companyId to Generated Content
- **Status:** [x] Completed
- **Problem:** Generated content (bios, resumes, etc.) has no company association, so we can't scope content to company context.
- **Solution:** Add nullable `companyId` column to `generated_content` table.
- **Files modified:**
  - `src/db/schema/content.ts` - Added companyId column with FK and index
  - Migration: `drizzle/0002_fixed_thunderball.sql`
- **Acceptance Criteria:**
  - [x] Migration generated successfully
  - [x] Content can be associated with a company
  - [x] Existing content remains unaffected (null companyId)

### 2.3 Add companyId to Photos
- **Status:** [x] Completed
- **Problem:** Photos have no company association for scoping.
- **Solution:** Add nullable `companyId` column to `photos` table.
- **Files modified:**
  - `src/db/schema/photos.ts` - Added companyId column with FK and index
  - Migration: `drizzle/0002_fixed_thunderball.sql`
- **Acceptance Criteria:**
  - [x] Migration generated successfully
  - [x] Photos can be associated with a company

### 2.4 Create Company Activity Table
- **Status:** [x] Completed
- **Problem:** No way to track company member activity for the admin dashboard feed.
- **Solution:** Create `company_activities` table to log significant events.
- **Files modified:**
  - `src/db/schema/companies.ts` - Added companyActivities table and companyActivityTypeEnum
  - Migration: `drizzle/0002_fixed_thunderball.sql`
- **Schema:**
  ```typescript
  {
    id: uuid
    companyId: uuid (FK, cascade delete)
    userId: uuid (FK, set null on delete)
    type: 'member_joined' | 'identity_completed' | 'first_photo' | 'first_bio' | 'content_generated'
    metadata: jsonb
    createdAt: timestamp
  }
  ```
- **Acceptance Criteria:**
  - [x] Migration generated successfully
  - [x] Activities can be logged and queried

---

## Phase 3: API Endpoints

### 3.1 Company Dashboard Stats Endpoint
- **Status:** [x] Completed
- **Problem:** No endpoint to fetch aggregated company statistics for admin dashboard.
- **Solution:** Create `GET /companies/:id/dashboard-stats` endpoint.
- **Files created/modified:**
  - `src/services/companies/stats.ts` - Created stats service with getDashboardStats()
  - `src/routes/companies/index.ts` - Added route
- **Response Shape:**
  ```typescript
  {
    companyId: string
    companyName: string
    logoUrl?: string
    totalMembers: number
    activeMembersLast7Days: number
    membersWithCompletedIdentity: number
    identityCompletionPercentage: number
    contentGenerated: {
      bios: number
      resumes: number
      total: number
    }
    membersWithPhotos: number
    membersWithBios: number
    recentJoins: Array<{userId, name, avatarUrl, joinedAt}>
    pendingInvitesCount: number
  }
  ```
- **Acceptance Criteria:**
  - [x] Returns accurate member counts
  - [x] Returns content generation stats
  - [x] Returns recent joins (last 5)
  - [x] Only accessible by company owner/admin

### 3.2 Company Activity Feed Endpoint
- **Status:** [x] Completed
- **Problem:** No endpoint to fetch recent company activity for dashboard feed.
- **Solution:** Create `GET /companies/:id/activity` endpoint.
- **Files modified:**
  - `src/services/companies/stats.ts` - Added getActivityFeed() and logActivity()
  - `src/routes/companies/index.ts` - Added route
  - `src/routes/companies/schemas.ts` - Added activityFeedQuerySchema
- **Acceptance Criteria:**
  - [x] Returns paginated activity list
  - [x] Filters by activity type (optional)
  - [x] Only accessible by company members

### 3.3 Update Brand Guidelines Endpoint
- **Status:** [x] Completed
- **Problem:** No way to update company brand guidelines.
- **Solution:** Add `PATCH /companies/:id/brand-guidelines` endpoint.
- **Files modified:**
  - `src/routes/companies/index.ts` - Added route
  - `src/routes/companies/schemas.ts` - Added brandGuidelinesSchema
  - `src/services/companies/index.ts` - Added updateBrandGuidelines()
- **Acceptance Criteria:**
  - [x] Only owner/admin can update
  - [x] Validates brand guidelines structure
  - [x] Returns updated company

### 3.4 Add companyId Support to Existing Endpoints
- **Status:** [x] Completed
- **Problem:** Existing content endpoints don't support company context scoping.
- **Solution:** Add optional `companyId` query param/body field to content endpoints.
- **Files modified:**
  - `src/routes/photos/index.ts` - Added companyId support to upload and list
  - `src/routes/photos/schemas.ts` - Added companyId to schemas
  - `src/services/photos/index.ts` - Added companyId to createPhoto and listByUser
  - `src/routes/bios/schemas.ts` - Added companyId to generate schemas
  - `src/services/modules/bio-generator/index.ts` - Added companyId to generation options
- **Endpoints updated:**
  - [x] `GET /photos` - Add `?companyId=` filter
  - [x] `POST /photos/upload` - Add optional `companyId` field
  - [x] `POST /bios/generate` - Add optional `companyId` field
  - [x] `POST /bios/dating-prompt` - Add optional `companyId` field
- **Acceptance Criteria:**
  - [x] Endpoints accept companyId parameter
  - [x] Content filtered/associated correctly
  - [x] Backwards compatible (works without companyId)

### 3.5 Company Identity Context Endpoint
- **Status:** [x] Completed
- **Problem:** No way to get user's identity merged with company brand guidelines.
- **Solution:** Enhance `GET /identity-brain` to accept `?companyId=` and return company context.
- **Files modified:**
  - `src/routes/identity-brain/index.ts` - Added companyId query parameter and company context response
  - `src/services/companies/index.ts` - Added isUserMemberOfCompany() helper
- **Response (when companyId provided):**
  ```typescript
  {
    identityBrain: {...},
    completion: {...},
    companyContext: {
      companyId: string
      companyName: string
      brandGuidelines: BrandGuidelines
    }
  }
  ```
- **Acceptance Criteria:**
  - [x] Returns company context when companyId provided
  - [x] Returns normal response without companyId
  - [x] User must be member of the company

---

## Phase 4: Activity Logging

### 4.1 Log Member Joined Activity
- **Status:** [x] Completed
- **Problem:** No record when members join a company.
- **Solution:** Log activity when company invite is accepted.
- **Files modified:**
  - `src/services/companies/invites.ts` - Added activity logging on accept
- **Acceptance Criteria:**
  - [x] Activity logged when invite accepted
  - [x] Includes user name/email

### 4.2 Log Identity Completion Activity
- **Status:** [x] Completed
- **Problem:** No record when members complete their identity brain.
- **Solution:** Log activity when identity brain reaches 80% completion.
- **Files modified:**
  - `src/services/identity-brain/index.ts` - Added completion check and logging in updateCoreAttributes()
- **Acceptance Criteria:**
  - [x] Activity logged when user reaches 80% for first time
  - [x] Only logs once per user per company

### 4.3 Log Content Generation Activity
- **Status:** [x] Completed
- **Problem:** No record of content generation for analytics.
- **Solution:** Log activity when content is generated in company context.
- **Files modified:**
  - `src/services/modules/bio-generator/index.ts` - Added activity logging for bio generation
  - `src/services/photos/index.ts` - Added first_photo activity logging
- **Acceptance Criteria:**
  - [x] Activity logged for company-context generations
  - [x] Includes content type and platform
  - [x] Logs first_bio when user generates their first bio in company
  - [x] Logs first_photo when user uploads their first photo in company

---

## Phase 5: Testing & Validation

### 5.1 Test Change Password Flow
- **Status:** [x] Completed
- **Files created/modified:**
  - `tests/routes/auth.test.ts` - Added change password test suite (8 test cases)
- **Acceptance Criteria:**
  - [x] Can change password with correct current password
  - [x] Fails with incorrect current password
  - [x] New password meets requirements (length, uppercase, number)
  - [x] Can login with new password after change

### 5.2 Test Company Dashboard Stats
- **Status:** [x] Completed
- **Files created/modified:**
  - `tests/routes/companies.test.ts` - Added dashboard stats, activity feed, and brand guidelines tests
- **Acceptance Criteria:**
  - [x] Stats accurate for test company
  - [x] Proper access control (403 for non-members)
  - [x] Activity feed returns paginated results
  - [x] Brand guidelines update works for owner

### 5.3 Test Content Scoping
- **Status:** [x] Completed
- **Files created/modified:**
  - `tests/routes/photos.test.ts` - Added company scoping tests
- **Acceptance Criteria:**
  - [x] Photos endpoint accepts companyId filter
  - [x] Returns empty when no photos match companyId

---

## Summary

| Phase | Items | Completed |
|-------|-------|-----------|
| Phase 1: Quick Wins | 1 | 1/1 |
| Phase 2: Schema Updates | 4 | 4/4 |
| Phase 3: API Endpoints | 5 | 5/5 |
| Phase 4: Activity Logging | 3 | 3/3 |
| Phase 5: Testing | 3 | 3/3 |
| **Total** | **16** | **16/16** |

---

## Notes

- All schema changes require migrations
- Run `bun db:generate` after schema changes
- Run `bun db:migrate` to apply migrations
- Frontend team should be notified of new endpoints

---

## Questions Resolved

| Question | Answer |
|----------|--------|
| Activity Tracking | Create new `company_activities` table |
| Brand Guidelines Storage | Add JSONB column to companies table |
| Content Association | Add nullable `companyId` column |
| Analytics Period | Default 30 days, support `?period=7d\|30d\|90d` |
| Caching | Consider for Phase 2 if needed |
