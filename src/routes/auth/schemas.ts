import { z } from 'zod'

// Register schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  inviteToken: z.string().optional(), // Required when INVITE_ONLY_REGISTRATION=true
})

export type RegisterInput = z.infer<typeof registerSchema>

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>

// Update profile schema
export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      notifications: z.boolean().optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
