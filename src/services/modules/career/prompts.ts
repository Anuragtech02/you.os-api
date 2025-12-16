/**
 * Career Module AI Prompts
 *
 * Prompts for generating professional career documents
 */

// ============================================
// Types
// ============================================

export type CareerDocumentType =
  | 'resume_summary'
  | 'resume_bullets'
  | 'cover_letter'
  | 'linkedin_headline'
  | 'linkedin_summary'
  | 'elevator_pitch'

export interface CareerIdentity {
  name: string
  occupation?: string
  industry?: string
  yearsExperience?: number
  skills?: string[]
  achievements?: string[]
  education?: string
  values?: string[]
  goals?: string[]
  communicationStyle?: string
}

export interface ResumePromptOptions {
  identity: CareerIdentity
  targetRole?: string
  targetCompany?: string
  industry?: string
  customInstructions?: string
  experienceItems?: ExperienceItem[]
}

export interface ExperienceItem {
  title: string
  company: string
  duration?: string
  responsibilities?: string[]
  achievements?: string[]
}

export interface CoverLetterOptions {
  identity: CareerIdentity
  targetRole: string
  targetCompany: string
  jobDescription?: string
  customInstructions?: string
}

export interface LinkedInOptions {
  identity: CareerIdentity
  targetAudience?: string
  keywords?: string[]
  customInstructions?: string
}

export interface ElevatorPitchOptions {
  identity: CareerIdentity
  duration: '30_seconds' | '60_seconds'
  context?: 'networking' | 'interview' | 'casual' | 'investor'
  customInstructions?: string
}

// ============================================
// Document Specifications
// ============================================

export const DOCUMENT_SPECS: Record<CareerDocumentType, {
  name: string
  maxLength: number | null
  description: string
}> = {
  resume_summary: {
    name: 'Resume Summary',
    maxLength: 400,
    description: '3-4 impactful sentences highlighting key achievements and value proposition',
  },
  resume_bullets: {
    name: 'Resume Bullet Points',
    maxLength: null,
    description: 'Achievement-focused bullet points with quantifiable results',
  },
  cover_letter: {
    name: 'Cover Letter',
    maxLength: 2000,
    description: '300-400 word personalized cover letter',
  },
  linkedin_headline: {
    name: 'LinkedIn Headline',
    maxLength: 120,
    description: 'Keyword-optimized professional headline',
  },
  linkedin_summary: {
    name: 'LinkedIn Summary',
    maxLength: 2600,
    description: 'Story-driven professional summary with keywords',
  },
  elevator_pitch: {
    name: 'Elevator Pitch',
    maxLength: null,
    description: 'Memorable verbal introduction pitch',
  },
}

// ============================================
// Prompt Builders
// ============================================

/**
 * Build resume summary prompt
 */
export function buildResumeSummaryPrompt(options: ResumePromptOptions): string {
  const { identity, targetRole, industry, customInstructions } = options

  let prompt = `Generate 3 professional resume summary variations for ${identity.name}.

## About the Person:
- Current Role: ${identity.occupation || 'Professional'}
- Industry: ${industry || identity.industry || 'Not specified'}
- Years of Experience: ${identity.yearsExperience || 'Not specified'}
- Key Skills: ${identity.skills?.join(', ') || 'Not specified'}
- Notable Achievements: ${identity.achievements?.join('; ') || 'Not specified'}
- Education: ${identity.education || 'Not specified'}

## Target:
${targetRole ? `- Target Role: ${targetRole}` : '- General professional summary'}

## Requirements:
- 3-4 sentences per summary (max 400 characters each)
- Start with a strong professional title/identity statement
- Highlight 2-3 key achievements or differentiators
- Include relevant keywords for ATS systems
- End with a value proposition or career goal
- Use active voice and power verbs
- Be specific and quantify achievements where possible

${customInstructions ? `## Additional Instructions:\n${customInstructions}` : ''}

Return ONLY a JSON array with this structure:
[
  {
    "summary": "The full summary text",
    "angle": "Brief description of the approach (e.g., 'Achievement-focused', 'Leadership-driven')",
    "characterCount": <number>
  }
]

Generate 3 distinct variations with different angles.`

  return prompt
}

/**
 * Build resume bullet points prompt
 */
export function buildResumeBulletsPrompt(options: ResumePromptOptions): string {
  const { identity, experienceItems, targetRole, customInstructions } = options

  const experienceContext = experienceItems?.length
    ? experienceItems.map(exp => `
- Role: ${exp.title} at ${exp.company}
  Duration: ${exp.duration || 'Not specified'}
  Responsibilities: ${exp.responsibilities?.join('; ') || 'Not specified'}
  Achievements: ${exp.achievements?.join('; ') || 'Not specified'}
`).join('\n')
    : 'No specific experience items provided'

  let prompt = `Generate powerful resume bullet points for ${identity.name}.

## Background:
- Current Role: ${identity.occupation || 'Professional'}
- Key Skills: ${identity.skills?.join(', ') || 'Not specified'}
- General Achievements: ${identity.achievements?.join('; ') || 'Not specified'}

## Experience to Improve:
${experienceContext}

${targetRole ? `## Target Role: ${targetRole}` : ''}

## Requirements for Each Bullet:
- Start with a strong ACTION VERB
- Include SPECIFIC metrics/numbers where possible (%, $, numbers)
- Show IMPACT and RESULTS, not just responsibilities
- Keep each bullet to 1-2 lines (max 150 characters)
- Use industry keywords for ATS optimization
- Format: Action Verb + Task + Result/Impact

${customInstructions ? `## Additional Instructions:\n${customInstructions}` : ''}

Return ONLY a JSON array with this structure:
[
  {
    "bullet": "The bullet point text",
    "category": "leadership|technical|achievement|collaboration|innovation",
    "strength": "Why this bullet is effective",
    "characterCount": <number>
  }
]

Generate 6-8 strong bullet points covering different aspects of experience.`

  return prompt
}

/**
 * Build cover letter prompt
 */
export function buildCoverLetterPrompt(options: CoverLetterOptions): string {
  const { identity, targetRole, targetCompany, jobDescription, customInstructions } = options

  let prompt = `Write a compelling cover letter for ${identity.name} applying to ${targetRole} at ${targetCompany}.

## About the Candidate:
- Current/Recent Role: ${identity.occupation || 'Professional'}
- Key Skills: ${identity.skills?.join(', ') || 'Not specified'}
- Notable Achievements: ${identity.achievements?.join('; ') || 'Not specified'}
- Education: ${identity.education || 'Not specified'}
- Values: ${identity.values?.join(', ') || 'Not specified'}
- Career Goals: ${identity.goals?.join('; ') || 'Not specified'}
- Communication Style: ${identity.communicationStyle || 'Professional'}

## Target Position:
- Role: ${targetRole}
- Company: ${targetCompany}
${jobDescription ? `- Job Description:\n${jobDescription}` : ''}

## Cover Letter Requirements:
- Length: 300-400 words (3-4 paragraphs)
- Paragraph 1: Strong opening hook, mention the specific role and why you're excited about THIS company
- Paragraph 2: Your most relevant experience and achievements that match the role
- Paragraph 3: Why you're a great cultural fit and what unique value you bring
- Paragraph 4: Confident close with call to action

## Style Guidelines:
- Professional but personable tone
- Show genuine enthusiasm for the company (research them)
- Be specific about achievements, not generic
- Mirror language from job description where appropriate
- Avoid clichés like "I'm a team player" or "hardworking"

${customInstructions ? `## Additional Instructions:\n${customInstructions}` : ''}

Return ONLY a JSON object with this structure:
{
  "coverLetter": "The full cover letter text",
  "keyPoints": ["Point 1 highlighted", "Point 2 highlighted", ...],
  "wordCount": <number>
}`

  return prompt
}

/**
 * Build LinkedIn headline prompt
 */
export function buildLinkedInHeadlinePrompt(options: LinkedInOptions): string {
  const { identity, targetAudience, keywords, customInstructions } = options

  let prompt = `Generate 5 LinkedIn headline options for ${identity.name}.

## Profile:
- Current Role: ${identity.occupation || 'Professional'}
- Industry: ${identity.industry || 'Not specified'}
- Key Skills: ${identity.skills?.join(', ') || 'Not specified'}
- Career Goals: ${identity.goals?.join('; ') || 'Not specified'}

## Target Audience:
${targetAudience || 'Recruiters, hiring managers, industry peers'}

## Keywords to Include:
${keywords?.join(', ') || 'Relevant industry keywords'}

## Headline Requirements:
- MAXIMUM 120 characters (strict limit)
- Include 2-3 searchable keywords
- Show value proposition clearly
- Be specific about expertise area
- Consider using: Title | Specialty | Value Prop format
- Avoid generic titles like "Professional" or "Expert"
- Can include emoji sparingly if appropriate

${customInstructions ? `## Additional Instructions:\n${customInstructions}` : ''}

Return ONLY a JSON array with this structure:
[
  {
    "headline": "The headline text (max 120 chars)",
    "style": "keyword-focused|creative|authority|value-prop|hybrid",
    "searchTerms": ["keyword1", "keyword2"],
    "characterCount": <number>
  }
]

Generate 5 distinct headline options with different approaches.`

  return prompt
}

/**
 * Build LinkedIn summary prompt
 */
export function buildLinkedInSummaryPrompt(options: LinkedInOptions): string {
  const { identity, targetAudience, keywords, customInstructions } = options

  let prompt = `Write 2 LinkedIn summary/about section variations for ${identity.name}.

## Profile:
- Current Role: ${identity.occupation || 'Professional'}
- Industry: ${identity.industry || 'Not specified'}
- Years of Experience: ${identity.yearsExperience || 'Not specified'}
- Key Skills: ${identity.skills?.join(', ') || 'Not specified'}
- Notable Achievements: ${identity.achievements?.join('; ') || 'Not specified'}
- Education: ${identity.education || 'Not specified'}
- Values: ${identity.values?.join(', ') || 'Not specified'}
- Career Goals: ${identity.goals?.join('; ') || 'Not specified'}
- Communication Style: ${identity.communicationStyle || 'Professional'}

## Target Audience:
${targetAudience || 'Recruiters, hiring managers, potential collaborators'}

## Keywords to Weave In:
${keywords?.join(', ') || 'Industry-relevant keywords'}

## Summary Requirements:
- Length: 200-300 words (under 2600 character LinkedIn limit)
- Structure:
  * Opening hook (personal/compelling statement)
  * Career narrative (journey and expertise)
  * Key achievements with specifics
  * What you're looking for / call to action
- Write in FIRST PERSON
- Be professional but show personality
- Include relevant keywords naturally for search
- Break into readable paragraphs
- End with how to connect or what you're open to

${customInstructions ? `## Additional Instructions:\n${customInstructions}` : ''}

Return ONLY a JSON array with this structure:
[
  {
    "summary": "The full LinkedIn summary",
    "style": "storytelling|professional|conversational",
    "keyThemes": ["theme1", "theme2"],
    "characterCount": <number>
  }
]

Generate 2 distinct variations.`

  return prompt
}

/**
 * Build elevator pitch prompt
 */
export function buildElevatorPitchPrompt(options: ElevatorPitchOptions): string {
  const { identity, duration, context, customInstructions } = options

  const durationGuide = duration === '30_seconds'
    ? '75-100 words (about 30 seconds when spoken)'
    : '150-200 words (about 60 seconds when spoken)'

  const contextGuide = {
    networking: 'Professional networking event - be memorable and create conversation opportunities',
    interview: 'Job interview - focus on value you bring and relevant experience',
    casual: 'Casual introduction - keep it light but professional',
    investor: 'Investor pitch - focus on unique value proposition and market opportunity',
  }[context || 'networking']

  let prompt = `Write 3 elevator pitch variations for ${identity.name}.

## About:
- Current Role: ${identity.occupation || 'Professional'}
- Industry: ${identity.industry || 'Not specified'}
- Key Skills: ${identity.skills?.join(', ') || 'Not specified'}
- Notable Achievements: ${identity.achievements?.join('; ') || 'Not specified'}
- Career Goals: ${identity.goals?.join('; ') || 'Not specified'}
- Communication Style: ${identity.communicationStyle || 'Professional'}

## Pitch Requirements:
- Duration: ${duration === '30_seconds' ? '30 seconds' : '60 seconds'}
- Length: ${durationGuide}
- Context: ${contextGuide}

## Structure:
1. Hook: Compelling opening that grabs attention
2. Who you are: Clear professional identity
3. What you do: Your expertise and unique value
4. Proof point: A specific achievement or example
5. Ask/Close: What you're looking for or memorable closing

## Style Guidelines:
- Conversational and natural (meant to be SPOKEN)
- Confident but not arrogant
- Include one memorable detail or story
- End with a hook for continued conversation
- Avoid jargon unless context-appropriate

${customInstructions ? `## Additional Instructions:\n${customInstructions}` : ''}

Return ONLY a JSON array with this structure:
[
  {
    "pitch": "The full elevator pitch text",
    "style": "confident|conversational|storytelling|direct",
    "hook": "The opening line or hook",
    "wordCount": <number>
  }
]

Generate 3 distinct variations.`

  return prompt
}
