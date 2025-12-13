/**
 * Bio Generator Prompts
 *
 * Platform-specific prompts and templates for bio generation.
 */

// Platform specifications
export const PLATFORM_SPECS = {
  twitter: {
    name: 'Twitter/X',
    maxLength: 160,
    style: 'Casual, witty, personality-forward',
    features: ['hashtags optional', 'emojis allowed'],
  },
  instagram: {
    name: 'Instagram',
    maxLength: 150,
    style: 'Personal, aesthetic, emoji-friendly',
    features: ['emojis encouraged', 'line breaks work', 'link-in-bio mention'],
  },
  linkedin_summary: {
    name: 'LinkedIn Summary',
    maxLength: 2600,
    style: 'Professional, achievement-focused, keyword-rich',
    features: ['multiple paragraphs', 'bullet points', 'SEO keywords'],
  },
  linkedin_headline: {
    name: 'LinkedIn Headline',
    maxLength: 120,
    style: 'Professional, value proposition',
    features: ['keywords important', 'no hashtags'],
  },
  tinder: {
    name: 'Tinder',
    maxLength: 500,
    style: 'Flirty, fun, conversation starters',
    features: ['hooks important', 'humor works', 'authenticity valued'],
  },
  hinge: {
    name: 'Hinge',
    maxLength: 150,
    style: 'Authentic, thoughtful, answering prompts',
    features: ['prompt-based', 'specific details', 'conversation starters'],
  },
  bumble: {
    name: 'Bumble',
    maxLength: 300,
    style: 'Confident, clear personality',
    features: ['clear interests', 'what you want', 'authenticity'],
  },
  general_dating: {
    name: 'Dating (General)',
    maxLength: 500,
    style: 'Authentic, approachable, personality showcase',
    features: ['conversation hooks', 'genuine', 'unique details'],
  },
  custom: {
    name: 'Custom',
    maxLength: 1000,
    style: 'User-specified',
    features: [],
  },
} as const

export type PlatformType = keyof typeof PLATFORM_SPECS

/**
 * Build the bio generation prompt
 */
export function buildBioPrompt(context: {
  platform: PlatformType
  identity: {
    name?: string
    occupation?: string
    interests?: string[]
    values?: string[]
    personality?: string[]
    goals?: string[]
    quirks?: string[]
    communicationStyle?: string
  }
  persona?: {
    name: string
    description?: string
    toneWeights?: Record<string, number>
  }
  learningInsights?: {
    preferredTone?: string[]
    preferredLength?: 'short' | 'medium' | 'long'
    favoriteTopics?: string[]
    avoidTopics?: string[]
  }
  customInstructions?: string
  variations?: number
}): string {
  const spec = PLATFORM_SPECS[context.platform]
  const { identity, persona, learningInsights, customInstructions, variations = 3 } = context

  // Build identity section
  const identityParts: string[] = []
  if (identity.name) identityParts.push(`Name: ${identity.name}`)
  if (identity.occupation) identityParts.push(`Occupation: ${identity.occupation}`)
  if (identity.interests?.length) identityParts.push(`Interests: ${identity.interests.join(', ')}`)
  if (identity.values?.length) identityParts.push(`Values: ${identity.values.join(', ')}`)
  if (identity.personality?.length) identityParts.push(`Personality: ${identity.personality.join(', ')}`)
  if (identity.goals?.length) identityParts.push(`Goals: ${identity.goals.join(', ')}`)
  if (identity.quirks?.length) identityParts.push(`Unique Quirks: ${identity.quirks.join(', ')}`)
  if (identity.communicationStyle) identityParts.push(`Communication Style: ${identity.communicationStyle}`)

  // Build persona section
  let personaSection = ''
  if (persona) {
    personaSection = `
Persona Context:
- Persona Name: ${persona.name}
${persona.description ? `- Description: ${persona.description}` : ''}
${persona.toneWeights ? `- Tone Weights: ${JSON.stringify(persona.toneWeights)}` : ''}`
  }

  // Build learning section
  let learningSection = ''
  if (learningInsights) {
    const parts: string[] = []
    if (learningInsights.preferredTone?.length) {
      parts.push(`- Preferred Tone: ${learningInsights.preferredTone.join(', ')}`)
    }
    if (learningInsights.preferredLength) {
      parts.push(`- Preferred Length: ${learningInsights.preferredLength}`)
    }
    if (learningInsights.favoriteTopics?.length) {
      parts.push(`- Topics to Include: ${learningInsights.favoriteTopics.join(', ')}`)
    }
    if (learningInsights.avoidTopics?.length) {
      parts.push(`- Topics to Avoid: ${learningInsights.avoidTopics.join(', ')}`)
    }
    if (parts.length) {
      learningSection = `
Previous Preferences (from learning):
${parts.join('\n')}`
    }
  }

  return `Generate a bio for ${spec.name} based on this identity:

${identityParts.join('\n')}
${personaSection}
${learningSection}

Platform Constraints:
- Maximum Length: ${spec.maxLength} characters
- Style: ${spec.style}
- Features: ${spec.features.join(', ')}
${customInstructions ? `\nCustom Instructions: ${customInstructions}` : ''}

Generate ${variations} different bio options with different angles/approaches.
Each bio should:
1. Stay within the character limit
2. Match the platform's style
3. Showcase personality authentically
4. Include conversation hooks where appropriate
5. Be unique and memorable

Return as JSON array:
[
  {
    "bio": "The actual bio text",
    "angle": "Brief description of the approach used",
    "characterCount": <number>
  }
]

Return ONLY valid JSON, no markdown code blocks.`
}

/**
 * Build prompt for dating prompt answers (Hinge-style)
 */
export function buildDatingPromptAnswerPrompt(context: {
  promptQuestion: string
  identity: {
    name?: string
    interests?: string[]
    personality?: string[]
    quirks?: string[]
  }
  maxLength?: number
}): string {
  const { promptQuestion, identity, maxLength = 150 } = context

  return `Answer this dating app prompt in a way that's authentic, engaging, and shows personality:

Prompt: "${promptQuestion}"

About the person:
${identity.name ? `- Name: ${identity.name}` : ''}
${identity.interests?.length ? `- Interests: ${identity.interests.join(', ')}` : ''}
${identity.personality?.length ? `- Personality: ${identity.personality.join(', ')}` : ''}
${identity.quirks?.length ? `- Unique Traits: ${identity.quirks.join(', ')}` : ''}

Requirements:
- Maximum ${maxLength} characters
- Be specific and personal
- Include a conversation starter
- Show genuine personality
- Avoid generic answers

Generate 3 different answer options.

Return as JSON array:
[
  {
    "answer": "The actual answer text",
    "approach": "Brief description of the angle",
    "characterCount": <number>
  }
]

Return ONLY valid JSON, no markdown code blocks.`
}
