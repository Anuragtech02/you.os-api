import { z } from 'zod'

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Database (Direct connection for Drizzle)
  DATABASE_URL: z.string().url(),

  // AI Models
  GOOGLE_AI_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),

  // Optional: Banana.dev for Nano Banana
  BANANA_API_KEY: z.string().optional(),

  // Storage
  SUPABASE_STORAGE_BUCKET: z.string().default('photos'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // Sync
  SYNC_COOLDOWN_MS: z.coerce.number().default(300000), // 5 minutes
  SYNC_TIMEOUT_MS: z.coerce.number().default(60000), // 60 seconds

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('YOU.OS <noreply@youos.app>'),
  FRONTEND_URL: z.string().url().default('https://youos.app'),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    process.exit(1)
  }

  return parsed.data
}

export const env = validateEnv()
