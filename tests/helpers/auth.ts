/**
 * Auth test helpers
 *
 * Utilities for creating test users and getting auth tokens
 */

import { createClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import { env } from '@/config/env'
import { db } from '@/db/client'
import { users } from '@/db/schema'

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

export interface TestUser {
  id: string
  authId: string
  email: string
  fullName: string
  accessToken: string
  refreshToken: string
}

/**
 * Creates a test user and returns auth credentials
 */
export async function createTestUser(
  email = `test-${Date.now()}@example.com`,
  password = 'Test123456',
  fullName = 'Test User'
): Promise<TestUser> {
  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user in Supabase: ${authError?.message}`)
  }

  // Create user in our database
  const [newUser] = await db
    .insert(users)
    .values({
      authId: authData.user.id,
      email,
      fullName,
    })
    .returning()

  if (!newUser) {
    throw new Error('Failed to create test user in database')
  }

  // Sign in to get tokens
  const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError || !session.session) {
    throw new Error(`Failed to sign in test user: ${signInError?.message}`)
  }

  return {
    id: newUser.id,
    authId: authData.user.id,
    email,
    fullName,
    accessToken: session.session.access_token,
    refreshToken: session.session.refresh_token,
  }
}

/**
 * Deletes a test user from both Supabase and our database
 */
export async function deleteTestUser(authId: string): Promise<void> {
  try {
    // Delete from our database first
    await db.delete(users).where(eq(users.authId, authId))

    // Delete from Supabase Auth
    await supabase.auth.admin.deleteUser(authId)
  } catch (error) {
    console.error('Error deleting test user:', error)
  }
}

/**
 * Gets a valid access token for an existing user
 */
export async function getAccessToken(email: string, password: string): Promise<string> {
  const { data: session, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !session.session) {
    throw new Error(`Failed to get access token: ${error?.message}`)
  }

  return session.session.access_token
}
