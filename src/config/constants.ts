// API Version
export const API_VERSION = 'v1'
export const API_PREFIX = `/api/${API_VERSION}`

// Identity Brain
export const MAX_AUTO_VERSIONS = 5
export const IDENTITY_EMBEDDING_DIMENSIONS = 1536
export const CONTENT_EMBEDDING_DIMENSIONS = 1536
export const EMBEDDING_BLEND_RATIO = 0.8 // 80% identity, 20% content

// Personas
export const DEFAULT_PERSONAS = ['professional', 'dating', 'social', 'private'] as const
export type PersonaType = (typeof DEFAULT_PERSONAS)[number]

// Photo Engine
export const MAX_PHOTOS_PER_USER = 50
export const PHOTO_SCORE_WEIGHTS = {
  technical: 0.3,
  aesthetic: 0.3,
  context: 0.2,
  authenticity: 0.2,
} as const

// AI Models
export const AI_MODELS = {
  text: 'gemini-2.5-flash',
  vision: 'gemini-2.5-flash-preview-image-generation', // Nano Banana alternative
  embedding: 'text-embedding-3-small',
  fallback: 'gpt-5-mini',
} as const

// Rate Limits
export const RATE_LIMITS = {
  default: { max: 100, window: 60000 },
  auth: { max: 10, window: 60000 },
  ai: { max: 20, window: 60000 },
  sync: { max: 1, window: 300000 }, // 1 sync per 5 minutes
} as const

// Sync-All
export const SYNC_MODULES = [
  'photo_engine',
  'bio_generator',
  'career_module',
  'dating_module',
  'aesthetic_module',
] as const

// Bio Types
export const BIO_TYPES = [
  'twitter',
  'linkedin',
  'instagram',
  'tinder',
  'hinge',
  'bumble',
  'professional',
  'custom',
] as const

// Color Analysis
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const
export const UNDERTONES = ['warm', 'cool', 'neutral'] as const
