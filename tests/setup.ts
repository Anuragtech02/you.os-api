/**
 * Test Setup
 *
 * This file runs before all tests.
 * Loads environment variables from .env file.
 */

import { file } from 'bun'
import { join } from 'node:path'

// Load .env file manually for tests
async function loadEnv() {
  const envPath = join(import.meta.dir, '..', '.env')
  try {
    const envFile = file(envPath)
    const content = await envFile.text()

    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=')

      if (key && value && !process.env[key]) {
        process.env[key] = value
      }
    }
  } catch (error) {
    console.warn('Could not load .env file:', error)
  }
}

await loadEnv()

// Ensure we have the required environment variables for testing
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`Warning: ${envVar} is not set. Tests may fail.`)
  }
}

console.log('Test setup complete. Running tests...')
