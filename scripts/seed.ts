/**
 * Database Seed Script
 *
 * Populates the database with test data for frontend development.
 *
 * Usage: bun db:seed
 *
 * IMPORTANT: This script requires test users to already exist in Supabase Auth.
 * Create them first in the Supabase Dashboard or via the Auth API.
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

// =========================================
// Test Data Configuration
// =========================================

// These auth IDs should match users created in Supabase Auth
const TEST_AUTH_IDS = {
  user1: 'd00c4cfb-134c-4452-9117-f50e753f7ba1', // test@youos.app
  user2: '202e70db-0522-442e-b3e1-dcf906858f0e', // sarah@youos.app
  user3: '4390a281-fedb-4520-9a05-571ad7a12bba', // owner@acme.com
  user4: '5e6020ea-6b89-4fd8-bdfa-1d96ba13c78a', // candidate@acme.com
}

// =========================================
// Seed Functions
// =========================================

async function seedUsers() {
  console.log('🌱 Seeding users...')

  const usersData = [
    {
      authId: TEST_AUTH_IDS.user1,
      email: 'test@youos.app',
      fullName: 'Alex Johnson',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
      accountType: 'individual' as const,
      preferences: {
        theme: 'dark' as const,
        notifications: true,
        language: 'en',
        timezone: 'America/New_York',
      },
    },
    {
      authId: TEST_AUTH_IDS.user2,
      email: 'sarah@youos.app',
      fullName: 'Sarah Chen',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
      accountType: 'individual' as const,
      preferences: {
        theme: 'light' as const,
        notifications: true,
        language: 'en',
        timezone: 'America/Los_Angeles',
      },
    },
    {
      authId: TEST_AUTH_IDS.user3,
      email: 'owner@acme.com',
      fullName: 'Michael Brown',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael',
      accountType: 'company' as const,
      preferences: {
        theme: 'system' as const,
        notifications: true,
        language: 'en',
        timezone: 'Europe/London',
      },
    },
    {
      authId: TEST_AUTH_IDS.user4,
      email: 'candidate@acme.com',
      fullName: 'Emily Davis',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emily',
      accountType: 'company' as const,
      preferences: {
        theme: 'dark' as const,
        notifications: false,
        language: 'en',
        timezone: 'Europe/London',
      },
    },
  ]

  const users = await db.insert(schema.users).values(usersData).returning()
  console.log(`  ✅ Created ${users.length} users`)
  return users
}

async function seedIdentityBrains(users: schema.User[]) {
  console.log('🧠 Seeding identity brains...')

  const brainsData = users.map((user) => ({
    userId: user.id,
    coreAttributes: {
      name: user.fullName,
      age: 28 + Math.floor(Math.random() * 10),
      location: ['New York, NY', 'San Francisco, CA', 'London, UK', 'Austin, TX'][
        Math.floor(Math.random() * 4)
      ],
      occupation: ['Software Engineer', 'Product Designer', 'Marketing Manager', 'Data Scientist'][
        Math.floor(Math.random() * 4)
      ],
      interests: ['technology', 'travel', 'photography', 'cooking', 'fitness', 'music'].slice(
        0,
        3 + Math.floor(Math.random() * 3)
      ),
      values: ['authenticity', 'growth', 'creativity', 'connection', 'adventure'].slice(
        0,
        2 + Math.floor(Math.random() * 3)
      ),
      personality: ['thoughtful', 'curious', 'warm', 'ambitious', 'playful'].slice(
        0,
        2 + Math.floor(Math.random() * 2)
      ),
      goals: [
        'Build meaningful connections',
        'Advance career',
        'Travel more',
        'Learn new skills',
      ].slice(0, 2 + Math.floor(Math.random() * 2)),
      quirks: [
        'Makes puns at inappropriate times',
        'Always carries a book',
        'Obsessed with coffee',
      ],
      communicationStyle: 'Warm and engaging with a touch of humor',
    },
    aestheticState: {
      colorPalette: {
        primary: '#2563eb',
        secondary: ['#7c3aed', '#ec4899'],
        accents: ['#10b981', '#f59e0b'],
        neutrals: ['#1f2937', '#9ca3af', '#f3f4f6'],
        avoid: ['#ef4444'],
        season: 'autumn' as const,
        undertone: 'warm' as const,
      },
      styleArchetype: 'Modern Professional',
      hairSuggestions: ['Side-parted style', 'Natural waves', 'Textured layers'],
      makeupSuggestions: ['Neutral tones', 'Bold lip colors', 'Natural glow'],
      wardrobeGuidance: [
        'Tailored blazers in navy or charcoal',
        'Quality denim in dark washes',
        'Classic white shirts',
        'Minimalist accessories',
      ],
      lastAnalyzedAt: new Date().toISOString(),
    },
    learningState: {
      feedbackHistory: [],
      contentPatterns: {
        preferredLength: 'medium' as const,
        preferredTone: ['professional', 'friendly'],
        avoidTopics: ['politics', 'religion'],
        favoriteTopics: ['technology', 'travel', 'personal growth'],
      },
      performanceMetrics: {
        totalGenerations: 15,
        positiveRatings: 12,
        negativeRatings: 1,
        averageScore: 4.2,
      },
      lastLearnedAt: new Date().toISOString(),
    },
    syncStatus: 'completed' as const,
    lastSyncedAt: new Date(),
    currentVersion: 1,
  }))

  const brains = await db.insert(schema.identityBrains).values(brainsData).returning()
  console.log(`  ✅ Created ${brains.length} identity brains`)
  return brains
}

async function seedPersonas(brains: schema.IdentityBrain[]) {
  console.log('🎭 Seeding personas...')

  const personasData: schema.NewPersona[] = []

  for (const brain of brains) {
    // Professional persona
    personasData.push({
      identityBrainId: brain.id,
      personaType: 'professional',
      name: 'Career Mode',
      description: 'For LinkedIn, resumes, and professional networking',
      toneWeights: { professional: 0.8, confident: 0.7, approachable: 0.5 },
      styleMarkers: ['industry expertise', 'leadership', 'results-driven'],
      contentRules: {
        maxLength: 500,
        minLength: 100,
        includeEmoji: false,
        formality: 'formal' as const,
        excludeTopics: ['personal life', 'dating'],
      },
      isActive: true,
    })

    // Dating persona
    personasData.push({
      identityBrainId: brain.id,
      personaType: 'dating',
      name: 'Dating Mode',
      description: 'For dating apps and romantic connections',
      toneWeights: { playful: 0.7, authentic: 0.8, witty: 0.6 },
      styleMarkers: ['humor', 'vulnerability', 'genuine interest'],
      contentRules: {
        maxLength: 300,
        minLength: 50,
        includeEmoji: true,
        formality: 'casual' as const,
        excludeTopics: ['work stress', 'exes'],
      },
      isActive: true,
    })

    // Social persona
    personasData.push({
      identityBrainId: brain.id,
      personaType: 'social',
      name: 'Social Mode',
      description: 'For Instagram, Twitter, and social media',
      toneWeights: { casual: 0.8, engaging: 0.7, trendy: 0.5 },
      styleMarkers: ['relatable', 'shareable', 'visual storytelling'],
      contentRules: {
        maxLength: 280,
        minLength: 20,
        includeEmoji: true,
        formality: 'casual' as const,
        excludeTopics: ['controversial topics'],
      },
      isActive: true,
    })
  }

  const personas = await db.insert(schema.personas).values(personasData).returning()
  console.log(`  ✅ Created ${personas.length} personas`)
  return personas
}

async function seedPhotos(users: schema.User[]) {
  console.log('📸 Seeding photos...')

  const photosData: schema.NewPhoto[] = []

  for (const user of users.slice(0, 2)) {
    // Only seed photos for first 2 users
    for (let i = 1; i <= 5; i++) {
      photosData.push({
        userId: user.id,
        originalUrl: `https://picsum.photos/seed/${user.id}-${i}/800/1000`,
        thumbnailUrl: `https://picsum.photos/seed/${user.id}-${i}/200/250`,
        storagePath: `${user.id}/photo-${i}.jpg`,
        status: i <= 3 ? 'analyzed' : 'pending',
        scores:
          i <= 3
            ? {
                technical: 75 + Math.floor(Math.random() * 20),
                aesthetic: 70 + Math.floor(Math.random() * 25),
                context: 80 + Math.floor(Math.random() * 15),
                authenticity: 85 + Math.floor(Math.random() * 10),
                weighted: 78 + Math.floor(Math.random() * 15),
              }
            : {},
        overallScore: i <= 3 ? 75 + Math.floor(Math.random() * 20) : null,
        analysis:
          i <= 3
            ? {
                faceDetected: true,
                faceCount: 1,
                facialExpression: ['smiling', 'neutral', 'confident'][Math.floor(Math.random() * 3)],
                eyeContact: Math.random() > 0.3,
                composition: ['centered', 'rule of thirds', 'symmetrical'][
                  Math.floor(Math.random() * 3)
                ],
                lighting: ['natural', 'studio', 'golden hour'][Math.floor(Math.random() * 3)],
                background: ['outdoor', 'indoor', 'urban'][Math.floor(Math.random() * 3)],
                styleCategory: ['casual', 'professional', 'creative'],
                colorDominant: ['blue', 'neutral', 'warm'],
                mood: ['friendly', 'confident', 'approachable'][Math.floor(Math.random() * 3)],
                issues: i === 3 ? ['slight blur', 'background distraction'] : [],
                suggestions:
                  i === 3
                    ? ['Consider cropping tighter', 'Try better lighting']
                    : ['Great photo!'],
                bestFor: ['linkedin', 'dating', 'instagram'].slice(0, 2),
                avoidFor: i === 3 ? ['professional'] : [],
              }
            : {},
        metadata: {
          originalFilename: `photo-${i}.jpg`,
          mimeType: 'image/jpeg',
          fileSize: 500000 + Math.floor(Math.random() * 1000000),
          width: 800,
          height: 1000,
          uploadedFrom: 'web' as const,
        },
        isPrimary: i === 1,
        isPublic: true,
        analyzedAt: i <= 3 ? new Date() : null,
      })
    }
  }

  const photos = await db.insert(schema.photos).values(photosData).returning()
  console.log(`  ✅ Created ${photos.length} photos`)
  return photos
}

async function seedGeneratedContent(users: schema.User[], personas: schema.Persona[]) {
  console.log('✍️ Seeding generated content...')

  const contentData: schema.NewGeneratedContent[] = []

  // Bio examples
  contentData.push({
    userId: users[0].id,
    personaId: personas.find((p) => p.personaType === 'professional')?.id,
    contentType: 'linkedin_summary',
    platform: 'linkedin',
    title: 'LinkedIn Summary',
    content: `Passionate technologist with 5+ years building products that matter. I thrive at the intersection of user experience and scalable systems.

Currently leading frontend architecture at a growth-stage startup, where I've helped scale our platform from 10K to 500K users. My superpower? Translating complex technical concepts into solutions that delight users.

When I'm not coding, you'll find me mentoring aspiring developers, exploring NYC's coffee scene, or planning my next adventure.

Let's connect if you're building something meaningful.`,
    prompt: 'Generate a LinkedIn summary that showcases technical expertise while remaining approachable',
    model: 'gemini-2.5-flash',
    generationParams: {
      temperature: 0.7,
      maxTokens: 500,
      persona: 'professional',
      tone: ['professional', 'confident', 'approachable'],
      length: 'medium',
    },
    feedbackType: 'positive',
    feedbackComment: 'Love the tone!',
    feedbackAt: new Date(),
  })

  // Dating bio
  contentData.push({
    userId: users[0].id,
    personaId: personas.find((p) => p.personaType === 'dating')?.id,
    contentType: 'dating_profile',
    platform: 'hinge',
    title: 'Hinge Bio',
    content: `6'1" of dad jokes and genuine conversations ✨

Making you laugh > Making you wait for a text back

Currently obsessed with: perfecting my pasta carbonara, finding the best hiking spots, and debating whether Die Hard is a Christmas movie (it is).

Looking for someone who appreciates both spontaneous adventures and cozy nights in. Bonus points if you can beat me at trivia.`,
    prompt: 'Generate a witty Hinge bio that shows personality',
    model: 'gemini-2.5-flash',
    generationParams: {
      temperature: 0.8,
      maxTokens: 300,
      persona: 'dating',
      tone: ['playful', 'witty', 'authentic'],
      length: 'short',
      includeEmoji: true,
    },
    feedbackType: 'positive',
  })

  // Dating prompt answer
  contentData.push({
    userId: users[0].id,
    personaId: personas.find((p) => p.personaType === 'dating')?.id,
    contentType: 'dating_prompt',
    platform: 'hinge',
    title: "A life goal of mine",
    content: `To host a dinner party where everyone leaves saying "that was the best meal I've ever had" and I didn't set off the smoke alarm once 🍳`,
    prompt: 'Answer the Hinge prompt: A life goal of mine',
    model: 'gemini-2.5-flash',
    generationParams: {
      temperature: 0.8,
      maxTokens: 150,
      persona: 'dating',
      tone: ['playful', 'specific', 'relatable'],
    },
  })

  // Resume summary
  contentData.push({
    userId: users[0].id,
    personaId: personas.find((p) => p.personaType === 'professional')?.id,
    contentType: 'resume',
    platform: null,
    title: 'Resume Summary',
    content: `Senior Software Engineer with 5+ years of experience building scalable web applications. Specialized in React, TypeScript, and Node.js with a track record of leading cross-functional teams and delivering high-impact features. Passionate about clean code, user-centric design, and mentoring junior developers.`,
    prompt: 'Generate a professional resume summary',
    model: 'gemini-2.5-flash',
    generationParams: {
      temperature: 0.5,
      maxTokens: 200,
      persona: 'professional',
      tone: ['professional', 'concise', 'impactful'],
    },
    feedbackType: 'positive',
  })

  // Social post
  contentData.push({
    userId: users[0].id,
    personaId: personas.find((p) => p.personaType === 'social')?.id,
    contentType: 'bio',
    platform: 'instagram',
    title: 'Instagram Bio',
    content: `Building cool things @techstartup 💻
NYC → World 🌎
Coffee enthusiast ☕ | Weekend hiker ⛰️
DMs open for tech talks & travel recs`,
    prompt: 'Generate an Instagram bio',
    model: 'gemini-2.5-flash',
    generationParams: {
      temperature: 0.7,
      maxTokens: 150,
      persona: 'social',
      tone: ['casual', 'engaging'],
      includeEmoji: true,
    },
  })

  // Add content for second user
  contentData.push({
    userId: users[1].id,
    personaId: personas.find(
      (p) => p.personaType === 'dating' && p.identityBrainId === users[1].id
    )?.id,
    contentType: 'dating_profile',
    platform: 'bumble',
    title: 'Bumble Bio',
    content: `Designer by day, amateur chef by night 🎨👩‍🍳

I believe in good design, great conversations, and never saying no to dessert. Currently on a mission to find the best ramen in LA and someone to share it with.

Swipe right if you appreciate aesthetics and can debate whether serif or sans-serif fonts are superior (the correct answer is both, depending on context).`,
    prompt: 'Generate a Bumble bio for a creative professional',
    model: 'gemini-2.5-flash',
    generationParams: {
      temperature: 0.8,
      maxTokens: 300,
      persona: 'dating',
      tone: ['creative', 'playful', 'authentic'],
      includeEmoji: true,
    },
  })

  const content = await db.insert(schema.generatedContent).values(contentData).returning()
  console.log(`  ✅ Created ${content.length} generated content items`)
  return content
}

async function seedCompany(users: schema.User[]) {
  console.log('🏢 Seeding company...')

  const owner = users.find((u) => u.email === 'owner@acme.com')
  const candidate = users.find((u) => u.email === 'candidate@acme.com')

  if (!owner || !candidate) {
    console.log('  ⚠️ Skipping company seed - company users not found')
    return null
  }

  // Create company
  const [company] = await db
    .insert(schema.companies)
    .values({
      name: 'Acme Corporation',
      slug: 'acme-corp',
      domain: 'acme.com',
      logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=acme',
      brandColors: {
        primary: '#2563eb',
        secondary: '#7c3aed',
        accent: '#10b981',
      },
      settings: {
        allowedModules: ['career', 'bio', 'photo'],
        maxCandidates: 50,
        customBranding: true,
        ssoEnabled: false,
        domainRestriction: true,
      },
      subscriptionTier: 'business',
      subscriptionStatus: 'active',
      ownerId: owner.id,
    })
    .returning()

  console.log(`  ✅ Created company: ${company.name}`)

  // Update owner's company association
  await db.update(schema.users).set({ companyId: company.id }).where(eq(schema.users.id, owner.id))

  // Add owner as company admin
  await db.insert(schema.companyCandidates).values({
    companyId: company.id,
    userId: owner.id,
    role: 'owner',
    department: 'Executive',
    title: 'CEO',
    permissions: {
      canEditProfile: true,
      canViewAnalytics: true,
      canExportData: true,
      canInviteOthers: true,
    },
    joinedAt: new Date(),
  })

  // Add candidate
  await db.update(schema.users).set({ companyId: company.id }).where(eq(schema.users.id, candidate.id))

  await db.insert(schema.companyCandidates).values({
    companyId: company.id,
    userId: candidate.id,
    role: 'candidate',
    department: 'Engineering',
    title: 'Software Engineer',
    permissions: {
      canEditProfile: true,
      canViewAnalytics: false,
      canExportData: false,
      canInviteOthers: false,
    },
    joinedAt: new Date(),
  })

  console.log(`  ✅ Added 2 company members`)

  // Create a pending invite
  await db.insert(schema.companyInvites).values({
    companyId: company.id,
    email: 'newcandidate@acme.com',
    role: 'candidate',
    token: 'invite-token-' + Date.now(),
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    invitedBy: owner.id,
  })

  console.log(`  ✅ Created 1 pending invite`)

  return company
}

async function seedAdminUsers(users: schema.User[]) {
  console.log('👑 Seeding admin users...')

  // Make test@youos.app a Super Admin
  const superAdminUser = users.find((u) => u.email === 'test@youos.app')
  // Make sarah@youos.app a regular Admin
  const adminUser = users.find((u) => u.email === 'sarah@youos.app')

  if (!superAdminUser) {
    console.log('  ⚠️ Skipping admin seed - test@youos.app not found')
    return []
  }

  const adminsData: schema.NewAdminUser[] = []

  // Super Admin
  adminsData.push({
    userId: superAdminUser.id,
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

  // Regular Admin
  if (adminUser) {
    adminsData.push({
      userId: adminUser.id,
      role: 'admin',
      permissions: {
        users: { view: true, edit: true, delete: false, deactivate: true },
        companies: { view: true, edit: true, delete: false },
        content: { view: true, delete: true, moderate: true },
        settings: { view: true, edit: false },
        audit: { view: true, export: false },
        metrics: { view: true, export: false },
      },
      isActive: true,
    })
  }

  const admins = await db.insert(schema.adminUsers).values(adminsData).returning()
  console.log(`  ✅ Created ${admins.length} admin users`)
  console.log(`     - test@youos.app → Super Admin`)
  if (adminUser) {
    console.log(`     - sarah@youos.app → Admin`)
  }
  return admins
}

async function seedSignupInviteTokens(admins: schema.AdminUser[]) {
  console.log('🎟️ Seeding signup invite tokens...')

  const superAdmin = admins.find((a) => a.role === 'super_admin')

  const invitesData: schema.NewSignupInviteToken[] = [
    {
      token: 'BETA-TEST-001',
      email: null, // Can be used by anyone
      maxUses: '10',
      usedCount: '0',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdBy: superAdmin?.id,
      note: 'General beta tester invite',
      isActive: true,
    },
    {
      token: 'VIP-INVITE-2025',
      email: 'vip@example.com', // Restricted to specific email
      maxUses: '1',
      usedCount: '0',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdBy: superAdmin?.id,
      note: 'VIP invite for specific user',
      isActive: true,
    },
    {
      token: 'EXPIRED-TOKEN-123',
      email: null,
      maxUses: '5',
      usedCount: '3',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
      createdBy: superAdmin?.id,
      note: 'Expired invite for testing',
      isActive: true,
    },
    {
      token: 'FULLY-USED-TOKEN',
      email: null,
      maxUses: '2',
      usedCount: '2',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: superAdmin?.id,
      note: 'Fully used invite for testing',
      isActive: true,
    },
  ]

  const invites = await db.insert(schema.signupInviteTokens).values(invitesData).returning()
  console.log(`  ✅ Created ${invites.length} signup invite tokens`)
  console.log(`     - BETA-TEST-001 (10 uses, valid 30 days)`)
  console.log(`     - VIP-INVITE-2025 (1 use, restricted to vip@example.com)`)
  console.log(`     - EXPIRED-TOKEN-123 (expired)`)
  console.log(`     - FULLY-USED-TOKEN (max uses reached)`)
  return invites
}

async function seedSyncJobs(users: schema.User[]) {
  console.log('🔄 Seeding sync jobs...')

  const syncJobsData: schema.NewSyncJob[] = users.slice(0, 2).map((user) => ({
    userId: user.id,
    status: 'completed' as const,
    triggeredBy: 'manual',
    totalModules: 5,
    completedModules: 5,
    currentModule: null,
    moduleResults: {
      photo_engine: {
        module: 'photo_engine',
        status: 'completed' as const,
        startedAt: new Date(Date.now() - 60000).toISOString(),
        completedAt: new Date(Date.now() - 45000).toISOString(),
        itemsProcessed: 5,
      },
      bio_generator: {
        module: 'bio_generator',
        status: 'completed' as const,
        startedAt: new Date(Date.now() - 45000).toISOString(),
        completedAt: new Date(Date.now() - 30000).toISOString(),
        itemsProcessed: 3,
      },
      career_module: {
        module: 'career_module',
        status: 'completed' as const,
        startedAt: new Date(Date.now() - 30000).toISOString(),
        completedAt: new Date(Date.now() - 20000).toISOString(),
        itemsProcessed: 2,
      },
      dating_module: {
        module: 'dating_module',
        status: 'completed' as const,
        startedAt: new Date(Date.now() - 20000).toISOString(),
        completedAt: new Date(Date.now() - 10000).toISOString(),
        itemsProcessed: 4,
      },
      aesthetic_module: {
        module: 'aesthetic_module',
        status: 'completed' as const,
        startedAt: new Date(Date.now() - 10000).toISOString(),
        completedAt: new Date().toISOString(),
        itemsProcessed: 1,
      },
    },
    startedAt: new Date(Date.now() - 60000),
    completedAt: new Date(),
  }))

  const jobs = await db.insert(schema.syncJobs).values(syncJobsData).returning()
  console.log(`  ✅ Created ${jobs.length} sync jobs`)
  return jobs
}

// =========================================
// Main Seed Function
// =========================================

async function main() {
  console.log('🚀 Starting database seed...\n')

  try {
    // Check if data already exists
    const existingUsers = await db.select().from(schema.users).limit(1)
    if (existingUsers.length > 0) {
      console.log('⚠️  Database already contains data.')
      console.log('   Run "bun db:reset" first to clear existing data.\n')
      process.exit(1)
    }

    // Seed in order (respecting foreign key constraints)
    const users = await seedUsers()
    const brains = await seedIdentityBrains(users)
    const personas = await seedPersonas(brains)
    await seedPhotos(users)
    await seedGeneratedContent(users, personas)
    await seedCompany(users)
    const admins = await seedAdminUsers(users)
    await seedSignupInviteTokens(admins)
    await seedSyncJobs(users)

    console.log('\n✅ Database seeded successfully!')
    console.log('\n📋 Test Accounts:')
    console.log('   Email: test@youos.app (Individual user, Super Admin)')
    console.log('   Email: sarah@youos.app (Individual user, Admin)')
    console.log('   Email: owner@acme.com (Company owner)')
    console.log('   Email: candidate@acme.com (Company candidate)')
    console.log('\n🎟️  Signup Invite Tokens (for testing invite-only registration):')
    console.log('   Token: BETA-TEST-001 (10 uses, valid)')
    console.log('   Token: VIP-INVITE-2025 (1 use, restricted to vip@example.com)')
    console.log('\n⚠️  Remember to create these users in Supabase Auth with matching auth IDs!')
    console.log('⚠️  Set INVITE_ONLY_REGISTRATION=true to enable invite-only mode.')
  } catch (error) {
    console.error('\n❌ Seed failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
