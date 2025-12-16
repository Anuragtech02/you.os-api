/**
 * Aesthetic Module AI Prompts
 *
 * Prompts for generating personal styling and aesthetic recommendations.
 */

// ============================================
// Types
// ============================================

export type ColorSeason = 'spring' | 'summer' | 'autumn' | 'winter'
export type Undertone = 'warm' | 'cool' | 'neutral'
export type StyleArchetype =
  | 'classic'
  | 'modern'
  | 'bold'
  | 'casual'
  | 'edgy'
  | 'romantic'
  | 'professional'

export interface AestheticIdentity {
  name: string
  gender?: string
  age?: number
  occupation?: string
  lifestyle?: string
  preferences?: {
    stylePreferences?: string[]
    colorPreferences?: string[]
    avoidStyles?: string[]
  }
}

export interface PhotoAnalysisData {
  skinTone?: string
  hairColor?: string
  eyeColor?: string
  faceShape?: string
  currentStyle?: string
  colorDominant?: string[]
}

export interface ColorPaletteOptions {
  identity: AestheticIdentity
  photoAnalysis?: PhotoAnalysisData
  customInstructions?: string
}

export interface StylingOptions {
  identity: AestheticIdentity
  photoAnalysis?: PhotoAnalysisData
  targetArchetype?: StyleArchetype
  occasion?: 'everyday' | 'professional' | 'dating' | 'special'
  customInstructions?: string
}

export interface HairOptions {
  identity: AestheticIdentity
  photoAnalysis?: PhotoAnalysisData
  currentHairstyle?: string
  maintenanceLevel?: 'low' | 'medium' | 'high'
  customInstructions?: string
}

export interface MakeupOptions {
  identity: AestheticIdentity
  photoAnalysis?: PhotoAnalysisData
  occasion?: 'everyday' | 'professional' | 'date' | 'special'
  skillLevel?: 'beginner' | 'intermediate' | 'advanced'
  customInstructions?: string
}

export interface WardrobeOptions {
  identity: AestheticIdentity
  photoAnalysis?: PhotoAnalysisData
  budget?: 'budget' | 'moderate' | 'luxury'
  targetOccasions?: string[]
  customInstructions?: string
}

// ============================================
// Prompt Builders
// ============================================

/**
 * Build color palette analysis prompt
 */
export function buildColorPalettePrompt(options: ColorPaletteOptions): string {
  const { identity, photoAnalysis, customInstructions } = options

  let prompt = `Perform a personal color analysis and generate a flattering color palette for ${identity.name}.

## About the Person:
- Name: ${identity.name}
- Gender: ${identity.gender || 'Not specified'}
- Age: ${identity.age || 'Not specified'}
- Occupation: ${identity.occupation || 'Not specified'}
- Lifestyle: ${identity.lifestyle || 'Not specified'}

${photoAnalysis ? `
## Photo Analysis Data:
- Skin Tone: ${photoAnalysis.skinTone || 'Not analyzed'}
- Hair Color: ${photoAnalysis.hairColor || 'Not analyzed'}
- Eye Color: ${photoAnalysis.eyeColor || 'Not analyzed'}
- Dominant Colors Worn: ${photoAnalysis.colorDominant?.join(', ') || 'Not analyzed'}
` : '## No photo analysis data available - provide general guidance'}

## Analysis Required:
1. Determine undertone (warm/cool/neutral) based on available info
2. Identify color season (spring/summer/autumn/winter)
3. Generate flattering colors for:
   - Primary colors (most flattering)
   - Secondary colors (complementary)
   - Accent colors (for pops of color)
   - Neutral colors (for basics)
   - Colors to avoid

## Color Palette Requirements:
- Provide specific hex codes for each color
- Include 3-4 colors per category
- Consider versatility (clothing, accessories, makeup)
- Account for their lifestyle and occupation

${customInstructions ? `## Additional Instructions:\n${customInstructions}` : ''}

Return ONLY a JSON object with this structure:
{
  "season": "spring|summer|autumn|winter",
  "undertone": "warm|cool|neutral",
  "analysis": "Brief explanation of why this season/undertone",
  "palette": {
    "primary": [
      { "name": "Color Name", "hex": "#XXXXXX", "usage": "How to use this color" }
    ],
    "secondary": [
      { "name": "Color Name", "hex": "#XXXXXX", "usage": "How to use this color" }
    ],
    "accents": [
      { "name": "Color Name", "hex": "#XXXXXX", "usage": "How to use this color" }
    ],
    "neutrals": [
      { "name": "Color Name", "hex": "#XXXXXX", "usage": "How to use this color" }
    ],
    "avoid": [
      { "name": "Color Name", "hex": "#XXXXXX", "reason": "Why to avoid" }
    ]
  },
  "tips": ["Tip 1 for wearing these colors", "Tip 2", ...]
}`

  return prompt
}

/**
 * Build styling guidance prompt
 */
export function buildStylingPrompt(options: StylingOptions): string {
  const { identity, photoAnalysis, targetArchetype, occasion, customInstructions } = options

  let prompt = `Generate personalized styling guidance for ${identity.name}.

## About the Person:
- Name: ${identity.name}
- Gender: ${identity.gender || 'Not specified'}
- Age: ${identity.age || 'Not specified'}
- Occupation: ${identity.occupation || 'Not specified'}
- Lifestyle: ${identity.lifestyle || 'Not specified'}
${identity.preferences?.stylePreferences?.length ? `- Style Preferences: ${identity.preferences.stylePreferences.join(', ')}` : ''}
${identity.preferences?.avoidStyles?.length ? `- Styles to Avoid: ${identity.preferences.avoidStyles.join(', ')}` : ''}

${photoAnalysis ? `
## Current Aesthetic:
- Current Style: ${photoAnalysis.currentStyle || 'Not analyzed'}
- Face Shape: ${photoAnalysis.faceShape || 'Not analyzed'}
` : ''}

${targetArchetype ? `## Target Style Archetype: ${targetArchetype}` : ''}
${occasion ? `## Primary Occasion: ${occasion}` : ''}

## Style Archetypes Reference:
- Classic: Timeless, polished, quality over quantity
- Modern: Clean lines, minimalist, architectural
- Bold: Statement pieces, unique, head-turning
- Casual: Relaxed, comfortable, effortless
- Edgy: Alternative, rebellious, unconventional
- Romantic: Feminine, soft, delicate details
- Professional: Polished, authoritative, competent

## Requirements:
- Identify their current style direction
- Recommend a target style archetype that fits them
- Provide specific style direction and rules
- Include do's and don'ts
- Suggest key pieces to invest in
- Consider their lifestyle and profession

${customInstructions ? `## Additional Instructions:\n${customInstructions}` : ''}

Return ONLY a JSON object with this structure:
{
  "currentStyle": "Assessment of current style",
  "recommendedArchetype": "classic|modern|bold|casual|edgy|romantic|professional",
  "archetypeReason": "Why this archetype suits them",
  "styleDirection": "Overall style direction in 2-3 sentences",
  "styleRules": [
    { "rule": "Style rule", "explanation": "Why this works for them" }
  ],
  "dos": ["Do this", "Do that"],
  "donts": ["Avoid this", "Avoid that"],
  "keyPieces": [
    { "piece": "Item to invest in", "reason": "Why it's essential" }
  ],
  "signatureElements": ["Element that could become their signature", ...]
}`

  return prompt
}

/**
 * Build hair suggestions prompt
 */
export function buildHairPrompt(options: HairOptions): string {
  const { identity, photoAnalysis, currentHairstyle, maintenanceLevel, customInstructions } = options

  let prompt = `Generate personalized hair suggestions for ${identity.name}.

## About the Person:
- Name: ${identity.name}
- Gender: ${identity.gender || 'Not specified'}
- Age: ${identity.age || 'Not specified'}
- Occupation: ${identity.occupation || 'Not specified'}
- Lifestyle: ${identity.lifestyle || 'Not specified'}
${currentHairstyle ? `- Current Hairstyle: ${currentHairstyle}` : ''}
${maintenanceLevel ? `- Desired Maintenance Level: ${maintenanceLevel}` : ''}

${photoAnalysis ? `
## Physical Features:
- Face Shape: ${photoAnalysis.faceShape || 'Not analyzed'}
- Current Hair Color: ${photoAnalysis.hairColor || 'Not analyzed'}
- Skin Tone: ${photoAnalysis.skinTone || 'Not analyzed'}
- Eye Color: ${photoAnalysis.eyeColor || 'Not analyzed'}
` : ''}

## Requirements:
- Consider face shape for flattering cuts
- Account for lifestyle and maintenance preferences
- Suggest both cut and color options
- Consider current trends but prioritize what suits them
- Provide styling tips

${customInstructions ? `## Additional Instructions:\n${customInstructions}` : ''}

Return ONLY a JSON object with this structure:
{
  "currentAssessment": "Assessment of current hair",
  "faceShapeAnalysis": "How face shape influences recommendations",
  "cutSuggestions": [
    {
      "name": "Cut name/style",
      "description": "Description of the cut",
      "whyItWorks": "Why this suits them",
      "maintenance": "low|medium|high",
      "stylingRequired": "Daily styling needed"
    }
  ],
  "colorSuggestions": [
    {
      "name": "Color name",
      "description": "Description (e.g., 'warm honey blonde')",
      "whyItWorks": "Why this color flatters them",
      "maintenance": "low|medium|high"
    }
  ],
  "stylingTips": ["Tip 1", "Tip 2", ...],
  "productsRecommended": ["Product type 1", "Product type 2", ...],
  "avoid": ["What to avoid and why"]
}`

  return prompt
}

/**
 * Build makeup suggestions prompt
 */
export function buildMakeupPrompt(options: MakeupOptions): string {
  const { identity, photoAnalysis, occasion, skillLevel, customInstructions } = options

  let prompt = `Generate personalized makeup suggestions for ${identity.name}.

## About the Person:
- Name: ${identity.name}
- Age: ${identity.age || 'Not specified'}
- Occupation: ${identity.occupation || 'Not specified'}
- Lifestyle: ${identity.lifestyle || 'Not specified'}
${skillLevel ? `- Makeup Skill Level: ${skillLevel}` : ''}
${occasion ? `- Primary Occasion: ${occasion}` : ''}

${photoAnalysis ? `
## Physical Features:
- Skin Tone: ${photoAnalysis.skinTone || 'Not analyzed'}
- Eye Color: ${photoAnalysis.eyeColor || 'Not analyzed'}
- Hair Color: ${photoAnalysis.hairColor || 'Not analyzed'}
- Face Shape: ${photoAnalysis.faceShape || 'Not analyzed'}
` : ''}

## Occasions to Cover:
1. Everyday/Natural
2. Professional/Work
3. Date Night
4. Special Occasions

## Requirements:
- Provide looks for different occasions
- Consider their coloring for product shade recommendations
- Account for skill level
- Include technique tips
- Suggest product types (not specific brands)

${customInstructions ? `## Additional Instructions:\n${customInstructions}` : ''}

Return ONLY a JSON object with this structure:
{
  "colorAnalysis": "How their coloring influences makeup choices",
  "looks": {
    "everyday": {
      "description": "Overall look description",
      "steps": ["Step 1", "Step 2", ...],
      "keyProducts": ["Product type 1", "Product type 2"],
      "shadeRecommendations": {
        "foundation": "Undertone and depth guidance",
        "blush": "Recommended shade family",
        "lip": "Recommended shade family",
        "eyeshadow": "Recommended palette direction"
      },
      "timeRequired": "X minutes"
    },
    "professional": { ... same structure ... },
    "dateNight": { ... same structure ... },
    "special": { ... same structure ... }
  },
  "techniques": [
    { "technique": "Technique name", "howTo": "Brief how-to", "whyItHelps": "Why this helps them" }
  ],
  "productRecommendations": [
    { "product": "Product type", "purpose": "What it does", "priority": "essential|nice-to-have" }
  ],
  "avoid": ["What to avoid", ...]
}`

  return prompt
}

/**
 * Build wardrobe guidance prompt
 */
export function buildWardrobePrompt(options: WardrobeOptions): string {
  const { identity, photoAnalysis, budget, targetOccasions, customInstructions } = options

  let prompt = `Generate personalized wardrobe guidance for ${identity.name}.

## About the Person:
- Name: ${identity.name}
- Gender: ${identity.gender || 'Not specified'}
- Age: ${identity.age || 'Not specified'}
- Occupation: ${identity.occupation || 'Not specified'}
- Lifestyle: ${identity.lifestyle || 'Not specified'}
${identity.preferences?.stylePreferences?.length ? `- Style Preferences: ${identity.preferences.stylePreferences.join(', ')}` : ''}
${budget ? `- Budget Level: ${budget}` : ''}
${targetOccasions?.length ? `- Target Occasions: ${targetOccasions.join(', ')}` : ''}

${photoAnalysis ? `
## Current Style Assessment:
- Current Style: ${photoAnalysis.currentStyle || 'Not analyzed'}
` : ''}

## Camera-Ready Focus:
The person wants to look great in photos. Consider:
- Colors that photograph well
- Patterns that work on camera
- Textures that add visual interest
- What to avoid for photos

## Requirements:
- Provide wardrobe essentials list
- Suggest outfit combinations
- Include camera-ready outfit ideas
- Consider their lifestyle and occasions
- Account for budget level

${customInstructions ? `## Additional Instructions:\n${customInstructions}` : ''}

Return ONLY a JSON object with this structure:
{
  "currentWardrobeAssessment": "Assessment based on available info",
  "essentials": [
    {
      "item": "Item name",
      "description": "Specific description (color, style)",
      "versatility": "How many ways it can be worn",
      "priority": "must-have|should-have|nice-to-have"
    }
  ],
  "outfitCombinations": [
    {
      "name": "Outfit name (e.g., 'Power Meeting')",
      "occasion": "When to wear",
      "pieces": ["Piece 1", "Piece 2", ...],
      "accessories": ["Accessory 1", ...],
      "photographsWell": true/false
    }
  ],
  "cameraReadyTips": {
    "colorsThatPhotographWell": ["Color 1", "Color 2"],
    "patternsToAvoid": ["Pattern 1", ...],
    "texturesThatWork": ["Texture 1", ...],
    "outfitIdeas": ["Camera-ready outfit 1", ...]
  },
  "shoppingPriorities": [
    {
      "item": "Item to buy",
      "reason": "Why prioritize this",
      "budgetTip": "How to find this at their budget level"
    }
  ],
  "avoid": ["What to avoid", ...]
}`

  return prompt
}

/**
 * Build full aesthetic analysis prompt
 */
export function buildFullAestheticPrompt(
  identity: AestheticIdentity,
  photoAnalysis?: PhotoAnalysisData
): string {
  return `Perform a comprehensive aesthetic analysis for ${identity.name}.

## About the Person:
- Name: ${identity.name}
- Gender: ${identity.gender || 'Not specified'}
- Age: ${identity.age || 'Not specified'}
- Occupation: ${identity.occupation || 'Not specified'}
- Lifestyle: ${identity.lifestyle || 'Not specified'}

${photoAnalysis ? `
## Photo Analysis Data:
- Skin Tone: ${photoAnalysis.skinTone || 'Not analyzed'}
- Hair Color: ${photoAnalysis.hairColor || 'Not analyzed'}
- Eye Color: ${photoAnalysis.eyeColor || 'Not analyzed'}
- Face Shape: ${photoAnalysis.faceShape || 'Not analyzed'}
- Current Style: ${photoAnalysis.currentStyle || 'Not analyzed'}
` : ''}

## Analysis Required:
Provide a high-level aesthetic overview covering:
1. Color season and palette direction
2. Style archetype recommendation
3. Key focus areas for improvement
4. Overall aesthetic direction

Return ONLY a JSON object with this structure:
{
  "overallAesthetic": "High-level aesthetic direction in 2-3 sentences",
  "colorSeason": "spring|summer|autumn|winter",
  "styleArchetype": "classic|modern|bold|casual|edgy|romantic|professional",
  "keyStrengths": ["Strength 1", "Strength 2"],
  "focusAreas": ["Area to improve 1", "Area 2"],
  "quickWins": ["Quick improvement 1", "Quick improvement 2"],
  "signature": "What could become their signature style element"
}`
}
