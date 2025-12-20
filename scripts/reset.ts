/**
 * Database Reset Script
 *
 * Clears all data from the database while preserving the schema.
 * Use this before re-seeding.
 *
 * Usage: bun db:reset
 *
 * WARNING: This will delete ALL data!
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../src/db/schema'
import { sql } from 'drizzle-orm'

// Get DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required')
  process.exit(1)
}

const client = postgres(DATABASE_URL, { prepare: false })
const db = drizzle(client, { schema })

async function main() {
  console.log('🗑️  Resetting database...\n')

  // Confirm before proceeding
  const args = process.argv.slice(2)
  if (!args.includes('--force') && !args.includes('-f')) {
    console.log('⚠️  WARNING: This will delete ALL data from the database!')
    console.log('   Run with --force or -f to confirm.\n')
    process.exit(1)
  }

  try {
    // Delete in reverse order of dependencies (child tables first)
    console.log('🧹 Deleting data...')

    // Admin tables
    await db.delete(schema.signupInviteTokens)
    console.log('   ✓ signup_invite_tokens')

    await db.delete(schema.usageMetrics)
    console.log('   ✓ usage_metrics')

    await db.delete(schema.featureFlags)
    console.log('   ✓ feature_flags')

    await db.delete(schema.systemSettings)
    console.log('   ✓ system_settings')

    await db.delete(schema.auditLogs)
    console.log('   ✓ audit_logs')

    await db.delete(schema.adminUsers)
    console.log('   ✓ admin_users')

    // Sync tables
    await db.delete(schema.syncEvents)
    console.log('   ✓ sync_events')

    await db.delete(schema.syncJobs)
    console.log('   ✓ sync_jobs')

    // Content tables
    await db.delete(schema.contentTemplates)
    console.log('   ✓ content_templates')

    await db.delete(schema.generatedContent)
    console.log('   ✓ generated_content')

    // Photos
    await db.delete(schema.photos)
    console.log('   ✓ photos')

    // Identity brain tables
    await db.delete(schema.personas)
    console.log('   ✓ personas')

    await db.delete(schema.identityBrainVersions)
    console.log('   ✓ identity_brain_versions')

    await db.delete(schema.identityBrains)
    console.log('   ✓ identity_brains')

    // Company tables
    await db.delete(schema.companyInvites)
    console.log('   ✓ company_invites')

    await db.delete(schema.companyCandidates)
    console.log('   ✓ company_candidates')

    await db.delete(schema.companies)
    console.log('   ✓ companies')

    // Users (last, as other tables reference it)
    await db.delete(schema.users)
    console.log('   ✓ users')

    console.log('\n✅ Database reset complete!')
    console.log('   Run "bun db:seed" to repopulate with test data.')
  } catch (error) {
    console.error('\n❌ Reset failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
