# YOU.OS API - Module Documentation

This document covers the Career, Dating, and Aesthetic modules APIs.

**Base URL:** `https://api.youos.app`
**Authentication:** All endpoints require Bearer token in Authorization header.

```
Authorization: Bearer <access_token>
```

---

## Table of Contents

1. [Career Module](#career-module)
2. [Dating Module](#dating-module)
3. [Aesthetic Module](#aesthetic-module)
4. [Error Handling](#error-handling)

---

# Career Module

Base path: `/career`

## Resume Generation

### POST /career/resume/summary

Generate professional resume summaries.

**Request:**
```json
{
  "targetRole": "Senior Software Engineer",
  "industry": "Technology",
  "customInstructions": "Focus on leadership experience",
  "saveToHistory": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| targetRole | string | No | Target job role (max 100 chars) |
| industry | string | No | Target industry (max 100 chars) |
| customInstructions | string | No | Custom generation instructions (max 500 chars) |
| saveToHistory | boolean | No | Save to history (default: true) |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "summaries": [
      {
        "summary": "Results-driven Senior Software Engineer with 8+ years...",
        "angle": "Leadership-focused",
        "wordCount": 85
      },
      {
        "summary": "Innovative technologist specializing in...",
        "angle": "Technical expertise",
        "wordCount": 92
      }
    ],
    "model": "gemini-2.5-flash",
    "generationId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### POST /career/resume/bullets

Generate resume bullet points for work experience.

**Request:**
```json
{
  "experienceItems": [
    {
      "title": "Software Engineer",
      "company": "Tech Corp",
      "duration": "2020-2023",
      "responsibilities": ["Built APIs", "Led team of 3"],
      "achievements": ["Reduced latency by 40%"]
    }
  ],
  "targetRole": "Senior Engineer",
  "customInstructions": "Emphasize impact metrics",
  "saveToHistory": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| experienceItems | array | No | Work experience items (max 5) |
| experienceItems[].title | string | Yes | Job title (max 100 chars) |
| experienceItems[].company | string | Yes | Company name (max 100 chars) |
| experienceItems[].duration | string | No | Duration (max 50 chars) |
| experienceItems[].responsibilities | string[] | No | List of responsibilities (max 10) |
| experienceItems[].achievements | string[] | No | List of achievements (max 10) |
| targetRole | string | No | Target job role |
| customInstructions | string | No | Custom instructions |
| saveToHistory | boolean | No | Save to history (default: true) |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "bullets": [
      {
        "original": "Built APIs",
        "improved": "Architected and deployed RESTful APIs serving 100K+ daily requests with 99.9% uptime",
        "type": "achievement"
      }
    ],
    "model": "gemini-2.5-flash",
    "generationId": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

---

### POST /career/cover-letter

Generate a tailored cover letter.

**Request:**
```json
{
  "targetRole": "Product Manager",
  "targetCompany": "Google",
  "jobDescription": "We are looking for a Product Manager to lead...",
  "customInstructions": "Highlight startup experience",
  "saveToHistory": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| targetRole | string | **Yes** | Target job role (max 100 chars) |
| targetCompany | string | **Yes** | Target company (max 100 chars) |
| jobDescription | string | No | Full job description (max 5000 chars) |
| customInstructions | string | No | Custom instructions |
| saveToHistory | boolean | No | Save to history (default: true) |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "coverLetter": "Dear Hiring Manager,\n\nI am excited to apply for the Product Manager position at Google...",
    "keyPoints": [
      "Highlighted 5 years of product experience",
      "Connected startup background to Google's innovation culture",
      "Mentioned specific product launches"
    ],
    "wordCount": 342,
    "model": "gemini-2.5-flash",
    "generationId": "550e8400-e29b-41d4-a716-446655440002"
  }
}
```

---

### POST /career/linkedin/headline

Generate LinkedIn headlines.

**Request:**
```json
{
  "targetAudience": "Tech recruiters and startup founders",
  "keywords": ["Product Manager", "AI/ML", "B2B SaaS"],
  "customInstructions": "Make it memorable",
  "saveToHistory": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| targetAudience | string | No | Target audience (max 200 chars) |
| keywords | string[] | No | Keywords to include (max 10) |
| customInstructions | string | No | Custom instructions |
| saveToHistory | boolean | No | Save to history (default: true) |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "headlines": [
      {
        "headline": "Product Manager | Building AI-Powered B2B SaaS | Ex-Google",
        "characterCount": 58,
        "approach": "Professional with credentials"
      },
      {
        "headline": "Turning Complex Problems into Delightful Products | PM @ Tech",
        "characterCount": 62,
        "approach": "Value-focused"
      }
    ],
    "model": "gemini-2.5-flash",
    "generationId": "550e8400-e29b-41d4-a716-446655440003"
  }
}
```

---

### POST /career/linkedin/summary

Generate LinkedIn summary/About section.

**Request:**
```json
{
  "targetAudience": "Hiring managers in fintech",
  "keywords": ["payments", "API design", "scale"],
  "customInstructions": "Include a personal touch",
  "saveToHistory": true
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "summaries": [
      {
        "summary": "I build payment systems that handle millions of transactions...",
        "characterCount": 1250,
        "approach": "Story-driven"
      }
    ],
    "model": "gemini-2.5-flash",
    "generationId": "550e8400-e29b-41d4-a716-446655440004"
  }
}
```

---

### POST /career/elevator-pitch

Generate elevator pitches.

**Request:**
```json
{
  "duration": "30_seconds",
  "context": "networking",
  "customInstructions": "Focus on my unique background",
  "saveToHistory": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| duration | enum | **Yes** | `30_seconds` or `60_seconds` |
| context | enum | No | `networking`, `interview`, `casual`, `investor` |
| customInstructions | string | No | Custom instructions |
| saveToHistory | boolean | No | Save to history (default: true) |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "pitches": [
      {
        "pitch": "Hi, I'm Alex. I help companies turn their data into actionable insights...",
        "duration": "30_seconds",
        "wordCount": 65,
        "approach": "Problem-solution"
      }
    ],
    "model": "gemini-2.5-flash",
    "generationId": "550e8400-e29b-41d4-a716-446655440005"
  }
}
```

---

## Document Management

### GET /career/documents

List generated career documents.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| documentType | enum | No | Filter by type: `resume_summary`, `resume_bullets`, `cover_letter`, `linkedin_headline`, `linkedin_summary`, `elevator_pitch` |
| limit | number | No | Results per page (1-100, default: 20) |
| offset | number | No | Pagination offset (default: 0) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "contentType": "resume_summary",
        "title": "Resume Summary",
        "content": "Results-driven engineer...",
        "model": "gemini-2.5-flash",
        "createdAt": "2025-12-29T10:00:00.000Z"
      }
    ]
  },
  "meta": {
    "total": 15,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### GET /career/documents/:id

Get a specific document.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "contentType": "cover_letter",
      "title": "Cover Letter - Google PM",
      "content": "Dear Hiring Manager...",
      "model": "gemini-2.5-flash",
      "generationParams": {
        "targetRole": "Product Manager",
        "targetCompany": "Google"
      },
      "createdAt": "2025-12-29T10:00:00.000Z"
    }
  }
}
```

---

### PATCH /career/documents/:id

Update a document.

**Request:**
```json
{
  "content": "Updated content...",
  "title": "New Title"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| content | string | No* | Updated content (max 10000 chars) |
| title | string | No* | Updated title (max 200 chars) |

*At least one field is required.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "document": { ... }
  }
}
```

---

### DELETE /career/documents/:id

Delete a document.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Document deleted successfully"
  }
}
```

---

### GET /career/document-types

Get document type specifications.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "documentTypes": [
      {
        "id": "resume_summary",
        "name": "Resume Summary",
        "maxLength": 500,
        "description": "Professional summary for resume header"
      }
    ]
  }
}
```

---

# Dating Module

Base path: `/dating`

## Bio & Prompt Generation

### POST /dating/bio

Generate dating bios for a platform.

**Request:**
```json
{
  "platform": "hinge",
  "customInstructions": "Make it witty but genuine",
  "variations": 3,
  "saveToHistory": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| platform | enum | **Yes** | `tinder`, `hinge`, `bumble`, `general` |
| customInstructions | string | No | Custom instructions (max 500 chars) |
| variations | number | No | Number of variations (1-5, default: 3) |
| saveToHistory | boolean | No | Save to history (default: true) |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "bios": [
      {
        "bio": "6'1\" of dad jokes and genuine conversations ✨\n\nMaking you laugh > Making you wait for a text back",
        "angle": "Playful & self-aware",
        "characterCount": 95
      },
      {
        "bio": "Software engineer who codes by day and cooks by night...",
        "angle": "Interests-focused",
        "characterCount": 120
      }
    ],
    "platform": "hinge",
    "model": "gemini-2.5-flash",
    "generationId": "550e8400-e29b-41d4-a716-446655440010"
  }
}
```

---

### POST /dating/prompt

Generate dating prompt answers (Hinge/Bumble style).

**Request:**
```json
{
  "platform": "hinge",
  "promptQuestion": "A life goal of mine",
  "customInstructions": "Keep it fun",
  "saveToHistory": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| platform | enum | **Yes** | `tinder`, `hinge`, `bumble`, `general` |
| promptQuestion | string | **Yes** | The prompt question (5-200 chars) |
| customInstructions | string | No | Custom instructions |
| saveToHistory | boolean | No | Save to history (default: true) |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "answers": [
      {
        "answer": "To host a dinner party where everyone leaves saying 'that was the best meal I've ever had' 🍳",
        "approach": "Specific & relatable",
        "characterCount": 98
      }
    ],
    "promptQuestion": "A life goal of mine",
    "model": "gemini-2.5-flash",
    "generationId": "550e8400-e29b-41d4-a716-446655440011"
  }
}
```

---

## Messaging Assistance

### POST /dating/messaging/opener

Generate conversation starters based on match profile.

**Request:**
```json
{
  "matchBio": "Dog mom 🐕 | Coffee addict | Always planning my next adventure",
  "matchPhotosDescription": "Photos show hiking, dog, travel pics from Paris",
  "matchPrompts": [
    {
      "question": "My simple pleasures",
      "answer": "A good book and rainy days"
    }
  ],
  "tone": "playful"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| matchBio | string | No | Match's bio (max 1000 chars) |
| matchPhotosDescription | string | No | Description of match's photos |
| matchPrompts | array | No | Match's prompt answers (max 5) |
| matchPrompts[].question | string | Yes | Prompt question |
| matchPrompts[].answer | string | Yes | Prompt answer |
| tone | enum | No | `playful`, `witty`, `sincere`, `confident`, `casual` |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "openers": [
      {
        "message": "I see you're a dog mom - I have a golden retriever who thinks he's a lap dog. What breed is yours?",
        "approach": "Shared interest",
        "confidence": 0.85
      },
      {
        "message": "Paris looks amazing! What was your favorite hidden gem there?",
        "approach": "Travel curiosity",
        "confidence": 0.82
      }
    ],
    "model": "gemini-2.5-flash"
  }
}
```

---

### POST /dating/messaging/reply

Generate reply suggestions for ongoing conversations.

**Request:**
```json
{
  "conversationHistory": [
    { "sender": "match", "message": "Hey! I love your hiking photos. Where was that mountain shot taken?" },
    { "sender": "user", "message": "Thanks! That's Mount Rainier. Have you been?" },
    { "sender": "match", "message": "Not yet! It's on my bucket list though 😊" }
  ],
  "matchBio": "Adventure seeker | Plant mom | Aspiring chef",
  "tone": "witty"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| conversationHistory | array | **Yes** | Message history (1-50 messages) |
| conversationHistory[].sender | enum | Yes | `user` or `match` |
| conversationHistory[].message | string | Yes | Message content (max 2000 chars) |
| matchBio | string | No | Match's bio |
| tone | enum | No | Desired tone |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "replies": [
      {
        "message": "Well, we should fix that! I could be convinced to play tour guide for the right hiking partner 🏔️",
        "approach": "Flirty suggestion",
        "progressesConversation": true
      },
      {
        "message": "It's incredible - the sunrise hike is worth the early alarm. What's at the top of your bucket list?",
        "approach": "Deeper question",
        "progressesConversation": true
      }
    ],
    "model": "gemini-2.5-flash"
  }
}
```

---

### POST /dating/messaging/improve

Improve a draft message.

**Request:**
```json
{
  "draftMessage": "hey whats up",
  "context": "First message to match who likes hiking and photography"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| draftMessage | string | **Yes** | Your draft message (1-2000 chars) |
| context | string | No | Context about the conversation (max 500 chars) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "improvedMessage": "Hey! I noticed you're into hiking - that mountain shot in your third photo is incredible. Where was it taken?",
    "changes": [
      "Added specific reference to their profile",
      "Asked an engaging question",
      "Improved capitalization and punctuation"
    ],
    "analysis": {
      "originalScore": 2,
      "improvedScore": 8,
      "issues": ["Too generic", "No conversation hook", "Casual grammar"]
    },
    "alternativeVersion": "Love the hiking photos! Is that trail in the PNW? I've been looking for new spots to explore.",
    "model": "gemini-2.5-flash"
  }
}
```

---

### POST /dating/messaging/analyze

Analyze a conversation for insights.

**Request:**
```json
{
  "conversationHistory": [
    { "sender": "user", "message": "Hey! Love your dog" },
    { "sender": "match", "message": "Thanks! He's my best friend" },
    { "sender": "user", "message": "What breed?" },
    { "sender": "match", "message": "Golden retriever!" },
    { "sender": "user", "message": "Nice" }
  ],
  "matchBio": "Dog lover, coffee addict"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overallScore": 5.5,
    "engagementLevel": "medium",
    "insights": {
      "strengths": [
        "Good opening with shared interest",
        "Showed genuine curiosity"
      ],
      "weaknesses": [
        "Responses becoming too short",
        "Not asking follow-up questions",
        "Missing opportunities to share about yourself"
      ],
      "matchInterestLevel": "moderate",
      "conversationMomentum": "declining"
    },
    "suggestions": [
      "Share something about yourself related to dogs",
      "Ask about activities they do together",
      "Suggest a dog-friendly date idea"
    ],
    "nextMessageRecommendation": "I've always wanted a golden! Do you take him to any dog parks around here? I'm always looking for good spots.",
    "model": "gemini-2.5-flash"
  }
}
```

---

## Photo Ranking

### GET /dating/photos/ranking

Get AI-powered photo ranking for dating profiles.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "rankedPhotos": [
      {
        "photoId": "550e8400-e29b-41d4-a716-446655440020",
        "rank": 1,
        "overallScore": 92,
        "thumbnailUrl": "https://...",
        "analysis": {
          "strengths": ["Great smile", "Good lighting", "Eye contact"],
          "weaknesses": [],
          "bestFor": ["Main photo", "Dating apps"]
        }
      }
    ],
    "recommendations": {
      "mainPhoto": "550e8400-e29b-41d4-a716-446655440020",
      "suggestedOrder": ["photo1", "photo3", "photo2"],
      "photoGaps": ["Add a full-body shot", "Include a social photo with friends"]
    }
  }
}
```

---

## Coaching

### POST /dating/coaching/tasks

Generate personalized coaching tasks.

**Request:**
```json
{
  "currentProfileScore": 65,
  "completedTasks": ["Updated bio", "Added new photo"],
  "focusArea": "conversation"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| currentProfileScore | number | No | Current profile score (0-100) |
| completedTasks | string[] | No | Previously completed tasks (max 20) |
| focusArea | enum | No | `profile`, `photos`, `conversation`, `confidence`, `general` |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "task_1",
        "title": "Practice the 'Callback' technique",
        "description": "Reference something specific from earlier in your conversation to show you're paying attention",
        "category": "conversation",
        "difficulty": "medium",
        "estimatedTime": "5 minutes",
        "priority": "high"
      }
    ],
    "model": "gemini-2.5-flash"
  }
}
```

---

## Voice Note Analysis

### POST /dating/voice-note/analyze

Analyze a voice note for dating communication.

**Request:** Multipart form with audio file

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | audio | **Yes** | Audio file (mp3, wav, webm, ogg, m4a) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transcript": "Hey! So I was thinking about what you said about that hiking trail...",
    "analysis": {
      "tone": "friendly and enthusiastic",
      "pace": "good",
      "clarity": "clear",
      "energy": "high",
      "confidence": 7.5
    },
    "suggestions": [
      "Great energy! Consider pausing briefly between thoughts",
      "The enthusiasm comes through well"
    ],
    "overallScore": 8.2
  }
}
```

---

## Content Management

### GET /dating/content

List dating content history.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| platform | enum | No | Filter by: `tinder`, `hinge`, `bumble`, `general` |
| limit | number | No | Results per page (1-100, default: 20) |
| offset | number | No | Pagination offset (default: 0) |

---

### GET /dating/content/:id

Get specific content.

---

### DELETE /dating/content/:id

Delete content.

---

## Utilities

### GET /dating/platforms

Get supported platforms.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "platforms": [
      { "id": "tinder", "name": "Tinder", "maxBioLength": 500 },
      { "id": "hinge", "name": "Hinge", "maxBioLength": 150 },
      { "id": "bumble", "name": "Bumble", "maxBioLength": 300 }
    ]
  }
}
```

---

### GET /dating/prompts/hinge

Get Hinge prompt suggestions.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "prompts": [
      "A life goal of mine",
      "I get along best with people who",
      "The way to win me over is",
      "My simple pleasures"
    ]
  }
}
```

---

# Aesthetic Module

Base path: `/aesthetic`

## Profile & Analysis

### GET /aesthetic

Get user's aesthetic profile.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "colorPalette": {
      "primary": "#2563eb",
      "secondary": ["#7c3aed", "#ec4899"],
      "accents": ["#10b981", "#f59e0b"],
      "neutrals": ["#1f2937", "#9ca3af"],
      "avoid": ["#ef4444"],
      "season": "autumn",
      "undertone": "warm"
    },
    "styleArchetype": "Modern Professional",
    "hairSuggestions": ["Side-parted style", "Natural waves"],
    "makeupSuggestions": ["Neutral tones", "Bold lip colors"],
    "wardrobeGuidance": ["Tailored blazers", "Quality denim"],
    "lastAnalyzedAt": "2025-12-29T10:00:00.000Z"
  }
}
```

---

### POST /aesthetic/analyze

Run full aesthetic analysis (updates profile).

**Response (201):**
```json
{
  "success": true,
  "data": {
    "colorPalette": { ... },
    "styleArchetype": "Modern Professional",
    "hairSuggestions": [ ... ],
    "makeupSuggestions": [ ... ],
    "wardrobeGuidance": [ ... ],
    "analysisDetails": {
      "photosAnalyzed": 5,
      "detectedFeatures": {
        "skinTone": "warm medium",
        "hairColor": "dark brown",
        "eyeColor": "brown"
      }
    },
    "model": "gemini-2.5-flash"
  }
}
```

---

### PATCH /aesthetic

Update aesthetic preferences.

**Request:**
```json
{
  "gender": "female",
  "age": 28,
  "lifestyle": "active professional",
  "stylePreferences": ["minimalist", "modern"],
  "colorPreferences": ["earth tones", "jewel tones"],
  "avoidStyles": ["overly formal", "athleisure"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| gender | string | No | Gender identity (max 50 chars) |
| age | number | No | Age (13-120) |
| lifestyle | string | No | Lifestyle description (max 200 chars) |
| stylePreferences | string[] | No | Preferred styles (max 10) |
| colorPreferences | string[] | No | Color preferences (max 10) |
| avoidStyles | string[] | No | Styles to avoid (max 10) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Preferences updated successfully"
  }
}
```

---

## Color Palette

### POST /aesthetic/colors/generate

Generate personalized color palette.

**Request:**
```json
{
  "customInstructions": "Focus on professional settings"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| customInstructions | string | No | Custom instructions (max 500 chars) |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "colorPalette": {
      "primary": "#1e40af",
      "secondary": ["#7c3aed", "#0d9488"],
      "accents": ["#f59e0b", "#ec4899"],
      "neutrals": ["#1f2937", "#6b7280", "#f3f4f6"],
      "avoid": ["#fbbf24", "#ef4444"],
      "season": "winter",
      "undertone": "cool"
    },
    "explanation": {
      "seasonAnalysis": "Your cool undertone and high contrast features suggest a Winter palette",
      "bestColors": "Deep blues, emerald greens, and jewel tones will complement your features",
      "avoidReasons": "Warm oranges and muted tones may wash out your complexion"
    },
    "model": "gemini-2.5-flash"
  }
}
```

---

## Styling Guidance

### POST /aesthetic/styling/generate

Generate styling recommendations.

**Request:**
```json
{
  "targetArchetype": "modern",
  "occasion": "professional",
  "customInstructions": "I work in tech"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| targetArchetype | enum | No | `classic`, `modern`, `bold`, `casual`, `edgy`, `romantic`, `professional` |
| occasion | enum | No | `everyday`, `professional`, `dating`, `special` |
| customInstructions | string | No | Custom instructions |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "styleArchetype": "Modern Professional",
    "keyPieces": [
      "Tailored blazer in navy or charcoal",
      "High-quality basic tees",
      "Well-fitted dark jeans"
    ],
    "outfitIdeas": [
      {
        "occasion": "Important meeting",
        "outfit": "Navy blazer, white shirt, charcoal trousers, minimal watch",
        "notes": "Commands attention while remaining approachable"
      }
    ],
    "accessorySuggestions": [
      "Minimalist watch with leather band",
      "Simple stud earrings"
    ],
    "shoppingPriorities": [
      "Invest in one quality blazer first",
      "Build a capsule wardrobe of neutrals"
    ],
    "model": "gemini-2.5-flash"
  }
}
```

---

## Hair Suggestions

### POST /aesthetic/hair/generate

Generate personalized hair suggestions.

**Request:**
```json
{
  "currentHairstyle": "Long, straight, no bangs",
  "maintenanceLevel": "low",
  "customInstructions": "Looking for something fresh but professional"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| currentHairstyle | string | No | Current hairstyle description (max 200 chars) |
| maintenanceLevel | enum | No | `low`, `medium`, `high` |
| customInstructions | string | No | Custom instructions |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "style": "Long layers with face-framing pieces",
        "maintenance": "low",
        "description": "Adds movement and dimension without requiring frequent trims",
        "suitability": "Great for your face shape and lifestyle"
      },
      {
        "style": "Soft curtain bangs",
        "maintenance": "medium",
        "description": "Frames your face and adds a modern touch",
        "suitability": "Works well with your features"
      }
    ],
    "colorRecommendations": [
      "Subtle balayage in caramel tones to add warmth",
      "Glossy dark chocolate for low-maintenance richness"
    ],
    "stylingTips": [
      "Use a heat protectant before any heat styling",
      "A weekly hair mask will keep long hair healthy"
    ],
    "model": "gemini-2.5-flash"
  }
}
```

---

## Makeup Suggestions

### POST /aesthetic/makeup/generate

Generate makeup recommendations.

**Request:**
```json
{
  "occasion": "date",
  "skillLevel": "intermediate",
  "customInstructions": "I prefer a natural look"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| occasion | enum | No | `everyday`, `professional`, `date`, `special` |
| skillLevel | enum | No | `beginner`, `intermediate`, `advanced` |
| customInstructions | string | No | Custom instructions |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "looks": [
      {
        "name": "Elevated Natural",
        "description": "Glowing skin with a subtle eye and soft lip",
        "products": [
          { "category": "Base", "product": "Tinted moisturizer or light foundation" },
          { "category": "Eyes", "product": "Brown mascara, subtle shimmer on lids" },
          { "category": "Lips", "product": "Your-lips-but-better nude pink" }
        ],
        "applicationTips": [
          "Apply blush on the apples of cheeks and blend upward",
          "Use fingers to pat in lip color for a natural finish"
        ],
        "timeToCreate": "10-15 minutes"
      }
    ],
    "colorRecommendations": {
      "lips": ["Dusty rose", "Warm nude", "Soft mauve"],
      "eyes": ["Champagne", "Soft brown", "Taupe"],
      "cheeks": ["Peach", "Soft coral", "Warm pink"]
    },
    "productRecommendations": [
      {
        "category": "Foundation",
        "drugstore": "Maybelline Fit Me",
        "midRange": "NARS Sheer Glow",
        "luxury": "Armani Luminous Silk"
      }
    ],
    "model": "gemini-2.5-flash"
  }
}
```

---

## Wardrobe Guidance

### POST /aesthetic/wardrobe/generate

Generate wardrobe recommendations.

**Request:**
```json
{
  "budget": "moderate",
  "targetOccasions": ["work", "casual dates", "weekend brunch"],
  "customInstructions": "I live in a warm climate"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| budget | enum | No | `budget`, `moderate`, `luxury` |
| targetOccasions | string[] | No | Occasions to dress for (max 5) |
| customInstructions | string | No | Custom instructions |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "capsuleWardrobe": {
      "tops": [
        { "item": "White linen button-down", "versatility": "work, brunch, dates" },
        { "item": "Navy silk blouse", "versatility": "work, dates" }
      ],
      "bottoms": [
        { "item": "High-waisted wide-leg trousers", "versatility": "work, brunch" },
        { "item": "Dark wash straight jeans", "versatility": "casual, dates, brunch" }
      ],
      "dresses": [
        { "item": "Midi wrap dress in warm neutral", "versatility": "work, dates, brunch" }
      ],
      "outerwear": [
        { "item": "Light linen blazer", "versatility": "work, evening" }
      ],
      "shoes": [
        { "item": "Leather loafers", "versatility": "work, casual" },
        { "item": "Strappy low heels", "versatility": "dates, special" }
      ]
    },
    "shoppingList": [
      { "item": "White linen button-down", "priority": "high", "estimatedCost": "$50-80" },
      { "item": "Dark wash jeans", "priority": "high", "estimatedCost": "$80-120" }
    ],
    "outfitFormulas": [
      {
        "occasion": "Work",
        "formula": "Silk blouse + wide-leg trousers + loafers",
        "notes": "Add a blazer for important meetings"
      }
    ],
    "brandsToExplore": ["Everlane", "COS", "& Other Stories", "Madewell"],
    "model": "gemini-2.5-flash"
  }
}
```

---

# Error Handling

All endpoints return consistent error responses.

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body or parameters |
| `INVALID_INPUT` | 400 | Invalid input data |
| `MISSING_REQUIRED_FIELD` | 400 | Required field not provided |
| `UNAUTHORIZED` | 401 | No valid authentication token |
| `INVALID_TOKEN` | 401 | Token is malformed |
| `TOKEN_EXPIRED` | 401 | Token has expired |
| `FORBIDDEN` | 403 | Access denied |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `USER_NOT_FOUND` | 404 | User does not exist |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `ALREADY_EXISTS` | 409 | Resource already exists |
| `SYNC_IN_PROGRESS` | 409 | A sync operation is already running |
| `RATE_LIMITED` | 429 | Too many requests |
| `COOLDOWN_ACTIVE` | 429 | Must wait before retrying |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `AI_SERVICE_ERROR` | 500 | AI model service failure |
| `DATABASE_ERROR` | 500 | Database operation failed |

## Example Error Responses

### Validation Error (400)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "errors": {
        "platform": ["Required"],
        "promptQuestion": ["String must contain at least 5 character(s)"]
      }
    }
  }
}
```

### Unauthorized (401)

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No valid authentication token provided"
  }
}
```

### Not Found (404)

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Identity brain not found. Please create an identity brain first"
  }
}
```

### AI Service Error (500)

```json
{
  "success": false,
  "error": {
    "code": "AI_SERVICE_ERROR",
    "message": "Failed to generate dating bio"
  }
}
```

---

## Rate Limiting

- **Default:** 100 requests per minute per user
- Rate-limited responses include `Retry-After` header

---

## Prerequisites

Most generation endpoints require:

1. **User account** with completed profile
2. **Identity Brain** with core attributes populated
3. **Photos** (for aesthetic analysis)

If these are missing, you'll receive a `NOT_FOUND` error with a message indicating what needs to be set up first.
