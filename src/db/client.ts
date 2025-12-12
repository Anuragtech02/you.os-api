import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/config/env'
import * as schema from './schema'

// Connection for queries (transaction pooling mode)
const queryClient = postgres(env.DATABASE_URL, {
  prepare: false, // Required for Supabase transaction pooling
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(queryClient, { schema })

// Export types for use in services
export type Database = typeof db
