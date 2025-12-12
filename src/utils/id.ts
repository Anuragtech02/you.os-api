import { nanoid } from 'nanoid'

// Generate short IDs for various use cases
export const generateId = {
  // Standard 21 character ID
  default: () => nanoid(),

  // Short 12 character ID for URLs
  short: () => nanoid(12),

  // Prefixed IDs for different entity types
  user: () => `usr_${nanoid(16)}`,
  photo: () => `pho_${nanoid(16)}`,
  content: () => `cnt_${nanoid(16)}`,
  job: () => `job_${nanoid(16)}`,
  event: () => `evt_${nanoid(16)}`,
  version: () => `ver_${nanoid(16)}`,
  persona: () => `per_${nanoid(16)}`,
  company: () => `cmp_${nanoid(16)}`,

  // Session/token IDs (longer for security)
  session: () => nanoid(32),
  token: () => nanoid(48),
}

// Validate ID format
export function isValidId(id: string, prefix?: string): boolean {
  if (!id || typeof id !== 'string') return false

  if (prefix) {
    return id.startsWith(`${prefix}_`) && id.length > prefix.length + 1
  }

  // UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (uuidRegex.test(id)) return true

  // NanoID format (alphanumeric, 21 chars default)
  const nanoidRegex = /^[A-Za-z0-9_-]+$/
  return nanoidRegex.test(id) && id.length >= 12
}
