/**
 * Create Super Admin Script
 *
 * Creates or promotes a user to Super Admin role.
 *
 * Usage:
 *   bun scripts/create-super-admin.ts <email>
 *
 * Example:
 *   bun scripts/create-super-admin.ts admin@youos.app
 *
 * The user must already exist in the database (created via auth).
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import * as schema from '../src/db/schema'

// Get DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required')
  process.exit(1)
}

const client = postgres(DATABASE_URL, { prepare: false })
const db = drizzle(client, { schema })

async function main() {
  const email = process.argv[2]

  if (!email) {
    console.error('❌ Usage: bun scripts/create-super-admin.ts <email>')
    console.error('   Example: bun scripts/create-super-admin.ts admin@youos.app')
    process.exit(1)
  }

  console.log(`🔐 Creating Super Admin for: ${email}\n`)

  try {
    // Find user by email
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1)

    if (!user) {
      console.error(`❌ User not found: ${email}`)
      console.error('   Make sure the user has registered first.')
      process.exit(1)
    }

    console.log(`✓ Found user: ${user.fullName || user.email} (${user.id})`)

    // Check if already an admin
    const [existingAdmin] = await db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.userId, user.id))
      .limit(1)

    if (existingAdmin) {
      if (existingAdmin.role === 'super_admin') {
        console.log(`⚠️  User is already a Super Admin`)
        await client.end()
        return
      }

      // Update to Super Admin
      const [updated] = await db
        .update(schema.adminUsers)
        .set({
          role: 'super_admin',
          permissions: {
            users: { view: true, edit: true, delete: true, deactivate: true },
            companies: { view: true, edit: true, delete: true },
            content: { view: true, delete: true, moderate: true },
            settings: { view: true, edit: true },
            audit: { view: true, export: true },
            metrics: { view: true, export: true },
          },
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.adminUsers.id, existingAdmin.id))
        .returning()

      console.log(`✅ Upgraded to Super Admin: ${updated.id}`)
    } else {
      // Create new admin
      const [admin] = await db
        .insert(schema.adminUsers)
        .values({
          userId: user.id,
          role: 'super_admin',
          permissions: {
            users: { view: true, edit: true, delete: true, deactivate: true },
            companies: { view: true, edit: true, delete: true },
            content: { view: true, delete: true, moderate: true },
            settings: { view: true, edit: true },
            audit: { view: true, export: true },
            metrics: { view: true, export: true },
          },
          isActive: true,
        })
        .returning()

      console.log(`✅ Created Super Admin: ${admin.id}`)
    }

    console.log(`\n🎉 ${email} is now a Super Admin!`)
    console.log(`\nThey can now access /api/v1/admin/* endpoints.`)
  } catch (error) {
    console.error('\n❌ Failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
