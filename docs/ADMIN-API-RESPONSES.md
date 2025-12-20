# Super Admin API - Sample Responses

This document contains sample request/response examples for all Super Admin and invite-related endpoints.

---

## Table of Contents

1. [Invite Token Validation (Public)](#invite-token-validation-public)
2. [Admin Authentication](#admin-authentication)
3. [Admin User Management](#admin-user-management)
4. [Company Management](#company-management)
5. [User Management](#user-management)
6. [Dashboard Stats](#dashboard-stats)
7. [Signup Invite Tokens](#signup-invite-tokens)
8. [Settings](#settings)

---

## Invite Token Validation (Public)

### GET /auth/invite/:token

Validates an invite token before registration (no authentication required).

**Request:**
```
GET /api/v1/auth/invite/BETA-TEST-001
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "invite": {
      "restrictedToEmail": null,
      "expiresAt": "2025-01-19T00:00:00.000Z",
      "remainingUses": 10,
      "note": "General beta tester invite"
    },
    "inviteOnlyEnabled": true
  }
}
```

**Restricted to Email Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "invite": {
      "restrictedToEmail": "vip@example.com",
      "expiresAt": "2025-01-27T00:00:00.000Z",
      "remainingUses": 1,
      "note": "VIP invite for specific user"
    },
    "inviteOnlyEnabled": true
  }
}
```

**Error - Invalid Token (404):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Invalid invite token"
  }
}
```

**Error - Expired Token (404):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Invite token has expired"
  }
}
```

**Error - Usage Limit Reached (404):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Invite token has reached its usage limit"
  }
}
```

---

## Admin Authentication

### GET /admin/me

Get current admin user info. Requires authentication.

**Request:**
```
GET /api/v1/admin/me
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "userId": "u1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "role": "super_admin",
      "permissions": {
        "users": { "view": true, "edit": true, "delete": true, "deactivate": true },
        "companies": { "view": true, "edit": true, "delete": true },
        "content": { "view": true, "delete": true, "moderate": true },
        "settings": { "view": true, "edit": true },
        "audit": { "view": true, "export": true },
        "metrics": { "view": true, "export": true }
      },
      "isActive": true,
      "createdAt": "2025-12-20T10:00:00.000Z"
    },
    "user": {
      "id": "u1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "test@youos.app",
      "fullName": "Alex Johnson"
    }
  }
}
```

**Error - Not an Admin (403):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Admin privileges required."
  }
}
```

---

## Admin User Management

### GET /admin/admins

List all admin users. Requires Super Admin role.

**Request:**
```
GET /api/v1/admin/admins?limit=20&offset=0
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "admins": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "userId": "u1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "role": "super_admin",
        "permissions": {
          "users": { "view": true, "edit": true, "delete": true, "deactivate": true },
          "companies": { "view": true, "edit": true, "delete": true },
          "content": { "view": true, "delete": true, "moderate": true },
          "settings": { "view": true, "edit": true },
          "audit": { "view": true, "export": true },
          "metrics": { "view": true, "export": true }
        },
        "isActive": true,
        "createdAt": "2025-12-20T10:00:00.000Z",
        "user": {
          "id": "u1b2c3d4-e5f6-7890-abcd-ef1234567890",
          "email": "test@youos.app",
          "fullName": "Alex Johnson",
          "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=alex"
        }
      },
      {
        "id": "a2b3c4d5-e6f7-8901-bcde-f12345678901",
        "userId": "u2b3c4d5-e6f7-8901-bcde-f12345678901",
        "role": "admin",
        "permissions": {
          "users": { "view": true, "edit": true, "delete": false, "deactivate": true },
          "companies": { "view": true, "edit": true, "delete": false },
          "content": { "view": true, "delete": true, "moderate": true },
          "settings": { "view": true, "edit": false },
          "audit": { "view": true, "export": false },
          "metrics": { "view": true, "export": false }
        },
        "isActive": true,
        "createdAt": "2025-12-20T10:00:00.000Z",
        "user": {
          "id": "u2b3c4d5-e6f7-8901-bcde-f12345678901",
          "email": "sarah@youos.app",
          "fullName": "Sarah Chen",
          "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah"
        }
      }
    ]
  },
  "meta": {
    "total": 2,
    "limit": 20,
    "offset": 0
  }
}
```

### POST /admin/admins

Create a new admin user. Requires Super Admin role.

**Request:**
```
POST /api/v1/admin/admins
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "userId": "u3b4c5d6-e7f8-9012-cdef-g23456789012",
  "role": "moderator"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "a3b4c5d6-e7f8-9012-cdef-g23456789012",
      "userId": "u3b4c5d6-e7f8-9012-cdef-g23456789012",
      "role": "moderator",
      "permissions": {
        "users": { "view": true, "edit": false, "delete": false, "deactivate": false },
        "companies": { "view": true, "edit": false, "delete": false },
        "content": { "view": true, "delete": true, "moderate": true },
        "settings": { "view": false, "edit": false },
        "audit": { "view": false, "export": false },
        "metrics": { "view": false, "export": false }
      },
      "isActive": true,
      "createdAt": "2025-12-20T15:30:00.000Z"
    }
  }
}
```

**Error - User Already Admin (409):**
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_EXISTS",
    "message": "User is already an admin"
  }
}
```

### PATCH /admin/admins/:id

Update admin role. Requires Super Admin role.

**Request:**
```
PATCH /api/v1/admin/admins/a2b3c4d5-e6f7-8901-bcde-f12345678901
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "role": "admin"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "a2b3c4d5-e6f7-8901-bcde-f12345678901",
      "userId": "u2b3c4d5-e6f7-8901-bcde-f12345678901",
      "role": "admin",
      "permissions": {
        "users": { "view": true, "edit": true, "delete": false, "deactivate": true },
        "companies": { "view": true, "edit": true, "delete": false },
        "content": { "view": true, "delete": true, "moderate": true },
        "settings": { "view": true, "edit": false },
        "audit": { "view": true, "export": false },
        "metrics": { "view": true, "export": false }
      },
      "isActive": true,
      "updatedAt": "2025-12-20T16:00:00.000Z"
    }
  }
}
```

### DELETE /admin/admins/:id

Deactivate an admin. Requires Super Admin role.

**Request:**
```
DELETE /api/v1/admin/admins/a2b3c4d5-e6f7-8901-bcde-f12345678901
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "deactivated": true
  }
}
```

---

## Company Management

### GET /admin/companies

List all companies. Requires Super Admin role.

**Request:**
```
GET /api/v1/admin/companies?limit=20&offset=0&search=acme
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Acme Corporation",
        "slug": "acme-corp",
        "domain": "acme.com",
        "logoUrl": "https://api.dicebear.com/7.x/shapes/svg?seed=acme",
        "subscriptionTier": "business",
        "subscriptionStatus": "active",
        "isActive": true,
        "createdAt": "2025-12-20T10:00:00.000Z",
        "ownerEmail": "owner@acme.com",
        "memberCount": 2
      }
    ]
  },
  "meta": {
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

### POST /admin/companies

Create a new company. Requires Super Admin role.

**Request:**
```
POST /api/v1/admin/companies
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "TechStart Inc",
  "slug": "techstart",
  "domain": "techstart.io",
  "logoUrl": "https://example.com/logo.png",
  "ownerId": "u4b5c6d7-e8f9-0123-defg-h34567890123"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "company": {
      "id": "c2b3c4d5-e6f7-8901-bcde-f12345678901",
      "name": "TechStart Inc",
      "slug": "techstart",
      "domain": "techstart.io",
      "logoUrl": "https://example.com/logo.png",
      "ownerId": "u4b5c6d7-e8f9-0123-defg-h34567890123",
      "subscriptionTier": "business",
      "subscriptionStatus": "active",
      "isActive": true,
      "createdAt": "2025-12-20T16:30:00.000Z"
    }
  }
}
```

**Error - Slug Already Exists (409):**
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_EXISTS",
    "message": "Company slug already exists"
  }
}
```

### PATCH /admin/companies/:id

Update a company. Requires Super Admin role.

**Request:**
```
PATCH /api/v1/admin/companies/c1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Acme Corp International",
  "domain": "acme.io"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "company": {
      "id": "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Acme Corp International",
      "slug": "acme-corp",
      "domain": "acme.io",
      "logoUrl": "https://api.dicebear.com/7.x/shapes/svg?seed=acme",
      "subscriptionTier": "business",
      "subscriptionStatus": "active",
      "isActive": true,
      "updatedAt": "2025-12-20T17:00:00.000Z"
    }
  }
}
```

### POST /admin/companies/:id/admin

Assign a Company Admin to a company. Requires Super Admin role.

**Request:**
```
POST /api/v1/admin/companies/c1b2c3d4-e5f6-7890-abcd-ef1234567890/admin
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "userId": "u5b6c7d8-e9f0-1234-efgh-i45678901234"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "assigned": true,
    "companyId": "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "u5b6c7d8-e9f0-1234-efgh-i45678901234"
  }
}
```

---

## User Management

### GET /admin/users

List all users. Requires Admin role or higher.

**Request:**
```
GET /api/v1/admin/users?limit=20&offset=0&search=john&accountType=individual
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "u1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "authId": "d00c4cfb-134c-4452-9117-f50e753f7ba1",
        "email": "test@youos.app",
        "fullName": "Alex Johnson",
        "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
        "accountType": "individual",
        "companyId": null,
        "isActive": true,
        "preferences": {
          "theme": "dark",
          "notifications": true,
          "language": "en",
          "timezone": "America/New_York"
        },
        "createdAt": "2025-12-20T10:00:00.000Z",
        "updatedAt": "2025-12-20T10:00:00.000Z"
      },
      {
        "id": "u2b3c4d5-e6f7-8901-bcde-f12345678901",
        "authId": "202e70db-0522-442e-b3e1-dcf906858f0e",
        "email": "sarah@youos.app",
        "fullName": "Sarah Chen",
        "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
        "accountType": "individual",
        "companyId": null,
        "isActive": true,
        "preferences": {
          "theme": "light",
          "notifications": true,
          "language": "en",
          "timezone": "America/Los_Angeles"
        },
        "createdAt": "2025-12-20T10:00:00.000Z",
        "updatedAt": "2025-12-20T10:00:00.000Z"
      }
    ]
  },
  "meta": {
    "total": 2,
    "limit": 20,
    "offset": 0
  }
}
```

### GET /admin/users/:id

Get user details. Requires Admin role or higher.

**Request:**
```
GET /api/v1/admin/users/u1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "u1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "authId": "d00c4cfb-134c-4452-9117-f50e753f7ba1",
      "email": "test@youos.app",
      "fullName": "Alex Johnson",
      "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
      "accountType": "individual",
      "companyId": null,
      "isActive": true,
      "preferences": {
        "theme": "dark",
        "notifications": true,
        "language": "en",
        "timezone": "America/New_York"
      },
      "createdAt": "2025-12-20T10:00:00.000Z",
      "updatedAt": "2025-12-20T10:00:00.000Z"
    },
    "identityBrain": {
      "id": "ib1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "currentVersion": 1,
      "syncStatus": "completed"
    },
    "company": null
  }
}
```

**User with Company Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "u3b4c5d6-e7f8-9012-cdef-g23456789012",
      "authId": "4390a281-fedb-4520-9a05-571ad7a12bba",
      "email": "owner@acme.com",
      "fullName": "Michael Brown",
      "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=michael",
      "accountType": "company",
      "companyId": "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "isActive": true,
      "preferences": {
        "theme": "system",
        "notifications": true,
        "language": "en",
        "timezone": "Europe/London"
      },
      "createdAt": "2025-12-20T10:00:00.000Z",
      "updatedAt": "2025-12-20T10:00:00.000Z"
    },
    "identityBrain": {
      "id": "ib3b4c5d6-e7f8-9012-cdef-g23456789012",
      "currentVersion": 1,
      "syncStatus": "completed"
    },
    "company": {
      "id": "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Acme Corporation",
      "role": "owner"
    }
  }
}
```

### POST /admin/users/:id/action

Deactivate or reactivate a user. Requires Admin role or higher.

**Request - Deactivate:**
```
POST /api/v1/admin/users/u1b2c3d4-e5f6-7890-abcd-ef1234567890/action
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "action": "deactivate"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "action": "deactivate",
    "userId": "u1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "success": true
  }
}
```

**Request - Reactivate:**
```
POST /api/v1/admin/users/u1b2c3d4-e5f6-7890-abcd-ef1234567890/action
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "action": "reactivate"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "action": "reactivate",
    "userId": "u1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "success": true
  }
}
```

---

## Dashboard Stats

### GET /admin/stats

Get dashboard statistics. Requires Admin role or higher.

**Request:**
```
GET /api/v1/admin/stats
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 4,
    "totalCompanies": 1,
    "totalAdmins": 2
  }
}
```

---

## Signup Invite Tokens

### GET /admin/invites

List signup invite tokens. Requires Super Admin role.

**Request:**
```
GET /api/v1/admin/invites?limit=20&offset=0&includeExpired=true
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "invites": [
      {
        "id": "i1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "token": "BETA-TEST-001",
        "email": null,
        "maxUses": 10,
        "usedCount": 0,
        "expiresAt": "2025-01-19T00:00:00.000Z",
        "note": "General beta tester invite",
        "isActive": true,
        "createdAt": "2025-12-20T10:00:00.000Z"
      },
      {
        "id": "i2b3c4d5-e6f7-8901-bcde-f12345678901",
        "token": "VIP-INVITE-2025",
        "email": "vip@example.com",
        "maxUses": 1,
        "usedCount": 0,
        "expiresAt": "2025-12-27T00:00:00.000Z",
        "note": "VIP invite for specific user",
        "isActive": true,
        "createdAt": "2025-12-20T10:00:00.000Z"
      },
      {
        "id": "i3b4c5d6-e7f8-9012-cdef-g23456789012",
        "token": "EXPIRED-TOKEN-123",
        "email": null,
        "maxUses": 5,
        "usedCount": 3,
        "expiresAt": "2025-12-19T00:00:00.000Z",
        "note": "Expired invite for testing",
        "isActive": true,
        "createdAt": "2025-12-20T10:00:00.000Z"
      },
      {
        "id": "i4b5c6d7-e8f9-0123-defg-h34567890123",
        "token": "FULLY-USED-TOKEN",
        "email": null,
        "maxUses": 2,
        "usedCount": 2,
        "expiresAt": "2025-01-19T00:00:00.000Z",
        "note": "Fully used invite for testing",
        "isActive": true,
        "createdAt": "2025-12-20T10:00:00.000Z"
      }
    ],
    "inviteOnlyEnabled": false
  },
  "meta": {
    "total": 4,
    "limit": 20,
    "offset": 0
  }
}
```

### POST /admin/invites

Create a new signup invite token. Requires Super Admin role.

**Request - General Invite:**
```
POST /api/v1/admin/invites
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "maxUses": 5,
  "expiresInDays": 14,
  "note": "Beta tester batch 1"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "i5b6c7d8-e9f0-1234-efgh-i45678901234",
    "token": "xK9mN2pQ4rS6tU8vW0xY2zA4bC6dE8fG",
    "email": null,
    "maxUses": 5,
    "expiresAt": "2025-01-03T00:00:00.000Z",
    "note": "Beta tester batch 1",
    "signupUrl": "https://youos.app/signup?invite=xK9mN2pQ4rS6tU8vW0xY2zA4bC6dE8fG"
  }
}
```

**Request - Email-Restricted Invite:**
```
POST /api/v1/admin/invites
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "maxUses": 1,
  "expiresInDays": 7,
  "note": "Personal invite for John"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "i6b7c8d9-e0f1-2345-fghi-j56789012345",
    "token": "aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV",
    "email": "john.doe@example.com",
    "maxUses": 1,
    "expiresAt": "2025-12-27T00:00:00.000Z",
    "note": "Personal invite for John",
    "signupUrl": "https://youos.app/signup?invite=aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV"
  }
}
```

### DELETE /admin/invites/:id

Revoke an invite token. Requires Super Admin role.

**Request:**
```
DELETE /api/v1/admin/invites/i1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "revoked": true
  }
}
```

**Error - Not Found (404):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Invite token not found"
  }
}
```

---

## Settings

### GET /admin/settings/invite-only

Check if invite-only registration is enabled. Requires Admin role or higher.

**Request:**
```
GET /api/v1/admin/settings/invite-only
Authorization: Bearer <access_token>
```

**Success Response - Disabled (200):**
```json
{
  "success": true,
  "data": {
    "enabled": false,
    "envVariable": "INVITE_ONLY_REGISTRATION",
    "note": "Set INVITE_ONLY_REGISTRATION=true in environment to enable invite-only registration"
  }
}
```

**Success Response - Enabled (200):**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "envVariable": "INVITE_ONLY_REGISTRATION",
    "note": "Set INVITE_ONLY_REGISTRATION=true in environment to enable invite-only registration"
  }
}
```

---

## Common Error Responses

### Unauthorized (401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### Forbidden - Not Admin (403)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Admin privileges required."
  }
}
```

### Forbidden - Not Super Admin (403)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Super Admin privileges required."
  }
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "errors": {
        "email": ["Invalid email address"],
        "role": ["Invalid enum value. Expected 'super_admin' | 'admin' | 'moderator' | 'support'"]
      }
    }
  }
}
```

### Internal Server Error (500)
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## Admin Role Permissions Summary

| Role | Users | Companies | Content | Settings | Audit | Metrics |
|------|-------|-----------|---------|----------|-------|---------|
| **super_admin** | Full | Full | Full | Full | Full | Full |
| **admin** | View/Edit/Deactivate | View/Edit | Full | View only | View only | View only |
| **moderator** | View only | View only | Full | None | None | None |
| **support** | View only | View only | View only | None | None | None |
