/**
 * Dating Module AI Prompts
 *
 * Prompts for generating dating profile content and assistance.
 */

// ============================================
// Types
// ============================================

export type DatingPlatform = 'tinder' | 'hinge' | 'bumble' | 'general'

export interface DatingIdentity {
  name: string
  age?: number
  occupation?: string
  interests?: string[]
  personality?: string[]
  values?: string[]
  quirks?: string[]
  communicationStyle?: string
  lookingFor?: string
}

export interface DatingBioOptions {
  identity: DatingIdentity
  platform: DatingPlatform
  customInstructions?: string
  variations?: number
}

export interface DatingPromptOptions {
  identity: DatingIdentity
  platform: DatingPlatform
  promptQuestion: string
  customInstructions?: string
}

export interface MessagingOpenerOptions {
  identity: DatingIdentity
  matchBio?: string
  matchPhotosDescription?: string
  matchPrompts?: Array<{ question: string; answer: string }>
  tone?: 'playful' | 'witty' | 'sincere' | 'confident' | 'casual'
}

export interface MessagingReplyOptions {
  identity: DatingIdentity
  conversationHistory: Array<{ sender: 'user' | 'match'; message: string }>
  matchBio?: string
  tone?: 'playful' | 'witty' | 'sincere' | 'confident' | 'casual'
}

export interface MessageImproveOptions {
  identity: DatingIdentity
  draftMessage: string
  context?: string
}

export interface ConversationAnalysisOptions {
  conversationHistory: Array<{ sender: 'user' | 'match'; message: string }>
  matchBio?: string
}

export interface CoachingTaskOptions {
  identity: DatingIdentity
  currentProfileScore?: number
  completedTasks?: string[]
  focusArea?: 'profile' | 'photos' | 'conversation' | 'confidence' | 'general'
}

// ============================================
// Platform Specifications
// ============================================

export const PLATFORM_SPECS: Record<DatingPlatform, {
  name: string
  maxBioLength: number
  hasPrompts: boolean
  style: string
}> = {
  tinder: {
    name: 'Tinder',
    maxBioLength: 500,
    hasPrompts: false,
    style: 'Witty, direct, fun - hook them quickly',
  },
  hinge: {
    name: 'Hinge',
    maxBioLength: 0, // Uses prompts instead
    hasPrompts: true,
    style: 'Authentic, conversation-starting, genuine',
  },
  bumble: {
    name: 'Bumble',
    maxBioLength: 300,
    hasPrompts: true,
    style: 'Confident, interesting, makes them want to message first',
  },
  general: {
    name: 'General Dating',
    maxBioLength: 500,
    hasPrompts: false,
    style: 'Authentic, engaging, universally appealing',
  },
}

// ============================================
// Hinge Prompt Library
// ============================================

export const HINGE_PROMPTS = [
  "I'm looking for",
  "My simple pleasures",
  "The way to win me over is",
  "Dating me is like",
  "I'm convinced that",
  "Together, we could",
  "I geek out on",
  "A life goal of mine",
  "I'll fall for you if",
  "I'm weirdly attracted to",
  "My most irrational fear",
  "Two truths and a lie",
  "I want someone who",
  "I go crazy for",
  "My greatest strength",
  "Typical Sunday",
  "Change my mind about",
  "We're the same type of weird if",
  "This year I really want to",
  "Green flags I look for",
  "All I ask is that you",
  "I bet you can't",
  "Don't hate me if",
  "I'll brag about you to my friends if",
]

// ============================================
// Prompt Builders
// ============================================

/**
 * Build dating bio prompt
 */
export function buildDatingBioPrompt(options: DatingBioOptions): string {
  const { identity, platform, customInstructions, variations = 3 } = options
  const spec = PLATFORM_SPECS[platform]

  let prompt = `Generate ${variations} dating bio variations for ${identity.name} on ${spec.name}.

## About the Person:
- Name: ${identity.name}
- Age: ${identity.age || 'Not specified'}
- Occupation: ${identity.occupation || 'Not specified'}
- Interests: ${identity.interests?.join(', ') || 'Not specified'}
- Personality: ${identity.personality?.join(', ') || 'Not specified'}
- Values: ${identity.values?.join(', ') || 'Not specified'}
- Quirks: ${identity.quirks?.join(', ') || 'Not specified'}
- Looking For: ${identity.lookingFor || 'Not specified'}

## Platform: ${spec.name}
- Max Length: ${spec.maxBioLength} characters
- Style: ${spec.style}

## Requirements:
- Create conversation hooks that make people WANT to message
- Show personality, not just list traits
- Be specific and authentic - no generic dating clichés
- Include at least one unique/quirky detail
- Keep under ${spec.maxBioLength} characters
- Different angles for each variation

## Style Guidelines for ${spec.name}:
${platform === 'tinder' ? `
- Start with an attention-grabbing hook
- Use humor if natural to the person
- Keep it punchy and scannable
- End with a conversation starter or call to action
` : platform === 'bumble' ? `
- Be confident but not arrogant
- Give her something easy to message about
- Show ambition and interests
- Make it easy for her to start a conversation
` : `
- Be genuine and authentic
- Show what makes you unique
- Balance humor with substance
- Create intrigue without being mysterious
`}

${customInstructions ? `## Additional Instructions:\n${customInstructions}` : ''}

Return ONLY a JSON array with this structure:
[
  {
    "bio": "The full bio text",
    "angle": "Description of the approach (e.g., 'Humor-forward', 'Adventure-focused')",
    "hooks": ["Conversation starter 1", "Conversation starter 2"],
    "characterCount": <number>
  }
]`

  return prompt
}

/**
 * Build dating prompt answer prompt (for Hinge/Bumble prompts)
 */
export function buildDatingPromptAnswerPrompt(options: DatingPromptOptions): string {
  const { identity, platform, promptQuestion, customInstructions } = options
  const spec = PLATFORM_SPECS[platform]

  let prompt = `Generate 3 answers for this ${spec.name} prompt: "${promptQuestion}"

## About the Person:
- Name: ${identity.name}
- Interests: ${identity.interests?.join(', ') || 'Not specified'}
- Personality: ${identity.personality?.join(', ') || 'Not specified'}
- Quirks: ${identity.quirks?.join(', ') || 'Not specified'}
- Values: ${identity.values?.join(', ') || 'Not specified'}

## Requirements:
- Be specific and personal - NO generic answers
- Create conversation hooks
- Show personality and authenticity
- Keep answers concise but impactful
- Different approaches for each variation
- Avoid clichés like "travel, food, Netflix"

## Good Answer Qualities:
- Specific (names, places, details)
- Shows personality
- Creates opportunity for follow-up questions
- Memorable and unique
- Authentic to the person

${customInstructions ? `## Additional Instructions:\n${customInstructions}` : ''}

Return ONLY a JSON array with this structure:
[
  {
    "answer": "The prompt answer text",
    "approach": "Description of angle (e.g., 'Humor', 'Sincere', 'Quirky')",
    "conversationStarter": "A question someone might ask based on this",
    "characterCount": <number>
  }
]`

  return prompt
}

/**
 * Build messaging opener prompt
 */
export function buildMessagingOpenerPrompt(options: MessagingOpenerOptions): string {
  const { identity, matchBio, matchPhotosDescription, matchPrompts, tone = 'witty' } = options

  const matchContext = []
  if (matchBio) matchContext.push(`Bio: ${matchBio}`)
  if (matchPhotosDescription) matchContext.push(`Photos: ${matchPhotosDescription}`)
  if (matchPrompts?.length) {
    matchContext.push(`Prompts:\n${matchPrompts.map(p => `- "${p.question}": "${p.answer}"`).join('\n')}`)
  }

  let prompt = `Generate 5 conversation starters for ${identity.name} to message a match.

## About ${identity.name}:
- Interests: ${identity.interests?.join(', ') || 'Not specified'}
- Personality: ${identity.personality?.join(', ') || 'Not specified'}
- Communication Style: ${identity.communicationStyle || 'Conversational'}

## About the Match:
${matchContext.length > 0 ? matchContext.join('\n') : 'No profile information provided - generate general openers'}

## Tone: ${tone}

## Requirements:
- Reference something SPECIFIC from their profile (if available)
- Ask a question or give them something to respond to
- Show genuine interest, not just "hey" or "how are you"
- Be creative but not try-hard
- Different approaches for each option

## Opening Message Guidelines:
- DON'T: "Hey" / "How are you" / "You're beautiful"
- DO: Reference specific details from their profile
- DO: Ask interesting questions
- DO: Use light humor when appropriate
- DO: Be authentic to ${identity.name}'s personality

Return ONLY a JSON array with this structure:
[
  {
    "message": "The opening message",
    "referencedDetail": "What profile element this references (or 'general' if none)",
    "tone": "playful|witty|sincere|confident|casual",
    "followUpPotential": "What conversation this could lead to"
  }
]`

  return prompt
}

/**
 * Build messaging reply prompt
 */
export function buildMessagingReplyPrompt(options: MessagingReplyOptions): string {
  const { identity, conversationHistory, matchBio, tone = 'witty' } = options

  const historyText = conversationHistory
    .map(msg => `${msg.sender === 'user' ? identity.name : 'Match'}: "${msg.message}"`)
    .join('\n')

  let prompt = `Generate 3 reply options for ${identity.name} in this dating conversation.

## About ${identity.name}:
- Interests: ${identity.interests?.join(', ') || 'Not specified'}
- Personality: ${identity.personality?.join(', ') || 'Not specified'}
- Communication Style: ${identity.communicationStyle || 'Conversational'}

## Conversation History:
${historyText}

${matchBio ? `## Match's Profile:\n${matchBio}` : ''}

## Desired Tone: ${tone}

## Requirements:
- Keep the conversation flowing naturally
- Ask a follow-up question or give them something to respond to
- Stay consistent with ${identity.name}'s personality
- Match the conversation's energy level
- Don't be too eager or too aloof

## Reply Guidelines:
- Respond to what they said (show you're listening)
- Add something new to the conversation
- Include a question to keep it going
- Be authentic, not try-hard

Return ONLY a JSON array with this structure:
[
  {
    "reply": "The reply message",
    "strategy": "What this reply is trying to accomplish",
    "tone": "playful|witty|sincere|confident|casual",
    "nextTopicSuggestion": "Where this could lead the conversation"
  }
]`

  return prompt
}

/**
 * Build message improvement prompt
 */
export function buildMessageImprovePrompt(options: MessageImproveOptions): string {
  const { identity, draftMessage, context } = options

  let prompt = `Improve this draft dating message from ${identity.name}.

## Original Draft:
"${draftMessage}"

${context ? `## Context:\n${context}` : ''}

## About ${identity.name}:
- Personality: ${identity.personality?.join(', ') || 'Not specified'}
- Communication Style: ${identity.communicationStyle || 'Conversational'}

## Analysis Areas:
1. Tone (is it appropriate? too eager? too casual?)
2. Clarity (is the message clear?)
3. Engagement (does it invite a response?)
4. Authenticity (does it sound like a real person?)
5. Red flags (anything that might be off-putting?)

## Requirements:
- Keep the core intent of the message
- Make it sound natural, not scripted
- Ensure there's something to respond to
- Maintain authenticity to ${identity.name}'s voice

Return ONLY a JSON object with this structure:
{
  "improvedMessage": "The improved version",
  "changes": ["Change 1 made", "Change 2 made", ...],
  "analysis": {
    "toneAssessment": "Assessment of original tone",
    "engagementLevel": "low|medium|high",
    "redFlags": ["Any red flags found"],
    "strengths": ["Good aspects of original"]
  },
  "alternativeVersion": "A more significantly different alternative"
}`

  return prompt
}

/**
 * Build conversation analysis prompt
 */
export function buildConversationAnalysisPrompt(options: ConversationAnalysisOptions): string {
  const { conversationHistory, matchBio } = options

  const historyText = conversationHistory
    .map((msg, i) => `${i + 1}. ${msg.sender === 'user' ? 'You' : 'Match'}: "${msg.message}"`)
    .join('\n')

  let prompt = `Analyze this dating conversation and provide insights.

## Conversation:
${historyText}

${matchBio ? `## Match's Profile:\n${matchBio}` : ''}

## Analysis Required:
1. Overall conversation health
2. Interest level from both sides
3. What's working well
4. What could be improved
5. Suggested next moves

Return ONLY a JSON object with this structure:
{
  "overallHealth": "healthy|neutral|concerning",
  "interestLevel": {
    "user": "low|medium|high",
    "match": "low|medium|high",
    "signals": ["Signal 1", "Signal 2"]
  },
  "whatWorking": ["Thing 1", "Thing 2"],
  "improvements": ["Suggestion 1", "Suggestion 2"],
  "suggestedNextMoves": [
    {
      "move": "Description of suggested action",
      "reason": "Why this would help"
    }
  ],
  "conversationDirection": "Where this seems to be heading",
  "askForDateReady": true/false,
  "askForDateSuggestion": "If ready, how to ask (optional)"
}`

  return prompt
}

/**
 * Build coaching tasks prompt
 */
export function buildCoachingTasksPrompt(options: CoachingTaskOptions): string {
  const { identity, currentProfileScore, completedTasks, focusArea } = options

  let prompt = `Generate personalized dating coaching tasks for ${identity.name}.

## About ${identity.name}:
- Interests: ${identity.interests?.join(', ') || 'Not specified'}
- Personality: ${identity.personality?.join(', ') || 'Not specified'}

## Current Status:
- Profile Score: ${currentProfileScore ?? 'Not assessed'}
${completedTasks?.length ? `- Completed Tasks: ${completedTasks.join(', ')}` : '- No tasks completed yet'}
${focusArea ? `- Focus Area: ${focusArea}` : ''}

## Task Categories:
- Profile improvements (bio, prompts, photos)
- Conversation skills
- Photo suggestions
- Self-reflection exercises
- Confidence building

## Requirements:
- Tasks should be specific and actionable
- Include mix of quick wins and deeper work
- Personalize to their personality and interests
- Make tasks measurable where possible
- Include estimated time for each task

Return ONLY a JSON array with this structure:
[
  {
    "task": "The task description",
    "category": "profile|photos|conversation|confidence|reflection",
    "priority": "high|medium|low",
    "estimatedMinutes": <number>,
    "reason": "Why this task will help",
    "tips": ["Tip 1", "Tip 2"]
  }
]

Generate 5-7 tasks.`

  return prompt
}

/**
 * Build photo ranking prompt for dating
 */
export function buildDatingPhotoRankingPrompt(photos: Array<{
  id: string
  description: string
  scores: Record<string, number>
}>): string {
  const photoDescriptions = photos.map((p, i) =>
    `Photo ${i + 1} (ID: ${p.id}):
- Description: ${p.description}
- Quality Score: ${p.scores.qualityScore}/100
- Expression Score: ${p.scores.expressionScore}/100
- Lighting Score: ${p.scores.lightingScore}/100`
  ).join('\n\n')

  return `Rank these photos for dating profile use and recommend optimal order.

## Photos:
${photoDescriptions}

## Dating Photo Best Practices:
1. FIRST PHOTO: Clear face, genuine smile, good lighting, eye contact
2. Show variety (activities, settings, social situations)
3. Include at least one full body shot
4. Show authentic activities/interests
5. Avoid: Too many group shots, sunglasses in main, mirror selfies

## Requirements:
- Rank photos from best to worst for dating
- Suggest optimal order for profile
- Identify which photo should be the main/first photo
- Note any photos that should be removed or replaced

Return ONLY a JSON object with this structure:
{
  "ranking": [
    {
      "photoId": "ID",
      "rank": <number>,
      "suggestedPosition": "main|secondary|tertiary|remove",
      "reason": "Why this ranking",
      "datingAppeal": <0-100>
    }
  ],
  "suggestedOrder": ["photoId1", "photoId2", ...],
  "missingTypes": ["What photo types would improve the profile"],
  "overallAssessment": "Assessment of photo set for dating"
}`
}
