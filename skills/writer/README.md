# Writer Skill

Generate content in your authentic voice across emails, blogs, social media, and reports.

## Overview

The Writer skill learns from your writing samples and generates content that authentically sounds like you. Unlike generic AI content generation, this skill:
- Maintains 6 distinct voice profiles (work email, personal email, blog, LinkedIn, Twitter, reports)
- Interviews you like a Pulitzer-winning journalist to understand your message
- Validates output against your authentic patterns
- Saves versioned drafts to Obsidian

**Key Innovation**: Uses Claude's native LLM capabilities for voice analysis - no complex NLP libraries needed. Scripts just fetch samples, Geoffrey analyzes them.

## Quick Start

### 1. Initial Setup (Before First Use)

Gather writing samples for voice profile creation:

```bash
cd ~/non-ic-code/geoffrey/skills/writer/scripts

# Extract email samples (3 accounts)
bun extract-email-samples.js --account psd --date-range "2024-06-01:2025-12-06" --max-samples 100 --output "/tmp/email-psd.json"
bun extract-email-samples.js --account kh --date-range "2024-06-01:2025-12-06" --max-samples 50 --output "/tmp/email-kh.json"
bun extract-email-samples.js --account hrg --date-range "2024-06-01:2025-12-06" --max-samples 50 --output "/tmp/email-hrg.json"

# Extract blog samples (requires Geoffrey Chrome)
cd ~/non-ic-code/geoffrey/skills/browser-control && ./scripts/launch-chrome.sh
cd ~/non-ic-code/geoffrey/skills/writer/scripts
bun extract-blog-samples.js --urls "https://psd401.ai/blog/post1,https://blog.krishagel.com/post2,..." --output "/tmp/blog-samples.json"

# Extract social samples (requires login to LinkedIn/X in Geoffrey Chrome)
bun extract-social-samples.js --platform linkedin --profile-url "https://linkedin.com/in/krishagel" --max-posts 50 --output "/tmp/social-linkedin.json"
bun extract-social-samples.js --platform twitter --profile-url "https://x.com/KrisHagel" --max-posts 50 --output "/tmp/social-twitter.json"
```

Then ask Geoffrey to analyze samples and create voice profiles:
```
Analyze my writing samples and create voice profiles.

Email: /tmp/email-psd.json, /tmp/email-kh.json, /tmp/email-hrg.json
Blog: /tmp/blog-samples.json
Social: /tmp/social-linkedin.json, /tmp/social-twitter.json
```

**Estimated time**: 30-45 minutes

### 2. Using the Skill

Once voice profiles are created:

```
write blog post about our AI implementation journey
```

or

```
write email to my team about next week's meeting
```

or

```
write LinkedIn post about Stanford AI Tinkery visit
```

Geoffrey will:
1. Load your voice profile
2. Interview you about the content
3. Create an outline for approval
4. Generate a draft in your voice
5. Validate against your patterns
6. Save to Obsidian

## File Structure

```
skills/writer/
├── SKILL.md                            # Main skill definition with 6-phase workflow
├── scripts/
│   ├── extract-email-samples.js        # Fetch Gmail emails
│   ├── extract-blog-samples.js         # Fetch blog posts
│   ├── extract-social-samples.js       # Fetch LinkedIn/Twitter posts
│   └── README.md                       # Script documentation
├── templates/
│   ├── interview-questions.json        # Question sets per content type
│   └── voice-profile-template.json     # Empty profile structure
└── README.md                           # This file
```

**Data Storage**:
- Voice profiles: `~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/writing-voice.json`

**Obsidian Drafts**:
- `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Personal_Notes/Geoffrey/Writing/`
  - `Blog/`
  - `Email/`
  - `Social/`
  - `Reports/`

## Voice Profiles

Six distinct profiles capture different writing contexts:

| Profile | Source | Target Samples | Confidence |
|---------|--------|----------------|------------|
| `email_work` | PSD Gmail (sent, 6mo) | 50+ emails | Check writing-voice.json |
| `email_personal` | Personal/HRG Gmail | 50+ emails | Check writing-voice.json |
| `blog_technical` | psd401.ai + blog.krishagel.com | 10+ posts | Check writing-voice.json |
| `social_linkedin` | LinkedIn posts | 30+ posts | Check writing-voice.json |
| `social_twitter` | X/Twitter posts | 30+ posts | Check writing-voice.json |
| `report_formal` | User-provided samples | 5-10 reports | Check writing-voice.json |

**Confidence Levels**:
- **High (0.85+)**: 50+ samples - voice well established
- **Moderate (0.70-0.84)**: 20-49 samples - patterns emerging
- **Low (<0.70)**: <20 samples - insufficient, warn user

## 6-Phase Workflow

1. **Voice Profile Selection & Validation**
   - Detect content type
   - Load profile from writing-voice.json
   - Check confidence, warn if low

2. **Deep Interview (Adaptive)**
   - 3-5 questions for tweets/social
   - 4-8 questions for emails
   - 8-12 questions for blogs
   - 15+ questions for reports

3. **Content Planning & Outline**
   - Create structure based on interview + content type
   - Apply voice preferences
   - User approves outline

4. **Draft Generation**
   - Load identity from identity-core.json
   - Apply voice characteristics (tone, structure, vocabulary)
   - Write naturally with voice context

5. **Validation & Refinement**
   - Geoffrey self-validates against voice profile
   - Score 0-100 on tone, structure, vocab, formatting
   - Refine if score <85

6. **Storage & Versioning**
   - Save to Obsidian with frontmatter
   - Return text for copy/paste
   - Offer to open in Obsidian

## Integration Points

- **knowledge-manager**: Load identity context for personality alignment
- **google-workspace**: Fetch email samples from Gmail
- **browser-control**: Scrape blog/social posts
- **obsidian-manager**: Save versioned drafts

## Example Usage

### Quick Work Email
```
You: write email to my team about next week's leadership meeting

Geoffrey:
- Uses email_work profile (confidence: 0.92)
- Quick interview (4 questions)
- Generates ~200 word email
- Direct, bullet-point style
- Validation score: 89/100
```

### Blog Post
```
You: write blog about our AI implementation journey

Geoffrey:
- Uses blog_technical profile (confidence: 0.78)
- Standard interview (11 questions)
- Generates ~850 word post
- Accessible tone, staff quotes, chronological
- Validation score: 87/100
- Saves to Geoffrey/Writing/Blog/2025-12-06-ai-implementation.md
```

### LinkedIn Post
```
You: LinkedIn post about Stanford AI Tinkery visit

Geoffrey:
- Uses social_linkedin profile (confidence: 0.91)
- Quick interview (5 questions)
- Generates ~180 word post
- Thought leadership tone
- Validation score: 92/100
```

## Maintenance

### Quarterly Voice Refresh

Voice profiles should be refreshed every 3 months as writing styles evolve:

```bash
# Re-extract recent samples
bun scripts/extract-email-samples.js --account psd --date-range "2025-09-01:2025-12-06" --output "/tmp/email-refresh.json"

# Ask Geoffrey to update profile
"Update my email_work profile with /tmp/email-refresh.json"
```

Geoffrey will auto-warn if profiles are >12 months old.

## Troubleshooting

See `scripts/README.md` for detailed troubleshooting.

Common issues:
- **"No voice profile found"**: Run initial setup to create profiles
- **"Low confidence warning"**: Gather more samples (target 50+ for emails, 10+ for blogs)
- **"Geoffrey Chrome not running"**: `cd ~/non-ic-code/geoffrey/skills/browser-control && ./scripts/launch-chrome.sh`
- **"Failed to extract social posts"**: Log into LinkedIn/X in Geoffrey Chrome first

## Development

**Architecture**:
- Scripts fetch raw writing samples (email, blog, social)
- Geoffrey analyzes samples natively using LLM capabilities
- No NLP libraries - cleaner, more maintainable
- Voice profiles store samples + Geoffrey's analysis

**Adding New Content Types**:
1. Create extraction script if needed
2. Add profile to `voice-profile-template.json`
3. Add interview questions to `interview-questions.json`
4. Update SKILL.md workflow
5. Extract samples and ask Geoffrey to analyze

## Future Enhancements

- Real-time learning (auto-analyze new emails monthly)
- A/B testing (generate 2 versions, learn from choices)
- Collaborative voice (blend user + co-author)
- Multi-language (Spanish voice profiles)
- Performance tracking (voice drift detection)
- Audience-aware sub-profiles

## Version

**v0.1.0** - Initial implementation
- 6 voice profiles
- Sample extraction scripts
- 6-phase workflow with checkpoints
- Native LLM validation
- Obsidian integration
