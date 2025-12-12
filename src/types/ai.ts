// AI Provider types

export interface TextGenerationOptions {
  prompt: string
  systemPrompt?: string
  model?: string
  temperature?: number
  maxTokens?: number
  persona?: PersonaContext
}

export interface VisionAnalysisOptions {
  imageUrl: string
  prompt: string
  model?: string
  returnEmbedding?: boolean
}

export interface EmbeddingOptions {
  text: string
  model?: string
}

export interface PersonaContext {
  type: 'professional' | 'dating' | 'social' | 'private'
  toneWeights: Record<string, number>
  styleMarkers: string[]
  contentRules: {
    maxLength?: number
    minLength?: number
    includeEmoji?: boolean
    formality?: 'casual' | 'neutral' | 'formal'
    excludeTopics?: string[]
  }
}

export interface IdentityContext {
  coreAttributes: {
    name?: string
    age?: number
    location?: string
    occupation?: string
    interests?: string[]
    values?: string[]
    personality?: string[]
    goals?: string[]
    quirks?: string[]
    communicationStyle?: string
  }
  aestheticState: {
    colorPalette?: {
      primary: string
      secondary: string[]
      season: string
    }
    styleArchetype?: string
  }
  learningState: {
    contentPatterns?: {
      preferredLength?: string
      preferredTone?: string[]
      avoidTopics?: string[]
    }
  }
}

export interface GenerationContext {
  identity: IdentityContext
  persona?: PersonaContext
  photos?: {
    id: string
    score: number
    analysis: Record<string, unknown>
  }[]
  recentGenerations?: {
    content: string
    feedback?: 'positive' | 'negative' | 'neutral'
  }[]
}

// Cost tracking
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface CostEstimate {
  inputCost: number
  outputCost: number
  totalCost: number
  currency: 'USD'
}

// Model pricing (per 1M tokens) - December 2025
export const MODEL_PRICING: Record<
  string,
  { input: number; output: number; type: 'text' | 'vision' | 'embedding' }
> = {
  'gemini-2.5-flash': { input: 0.075, output: 0.3, type: 'text' },
  'gemini-2.5-flash-preview-image-generation': { input: 0.1, output: 0.4, type: 'vision' },
  'gpt-5-mini': { input: 0.15, output: 0.6, type: 'text' },
  'text-embedding-3-small': { input: 0.02, output: 0, type: 'embedding' },
}
