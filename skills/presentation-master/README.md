# Presentation Master

> **World-class presentation creation skill that embodies best practices from presentation masters and adapts to your needs.**

## Overview

Presentation Master is not just a presentation generator—it's a **presentation coach** that teaches world-class design principles while creating slides. Built on decades of wisdom from Garr Reynolds, Nancy Duarte, Guy Kawasaki, Seth Godin, TED speakers, Edward Tufte, and Steve Jobs, this skill ensures every presentation meets the highest standards.

## Key Innovation

Instead of just making slides, this skill:
- **Teaches** presentation best practices through guided creation
- **Validates** against proven design principles automatically
- **Adapts** to different presentation types and audiences
- **Coaches** you through checkpoints to ensure quality
- **Learns** from each presentation to improve future recommendations

## What Makes a Great Presentation?

Based on research of thousands of successful presentations, the masters agree on these principles:

1. **Simplicity** - Less is always more (Seth Godin: 6 words max per slide)
2. **Visual Dominance** - Show, don't write (Garr Reynolds: Pictures > text)
3. **Story Structure** - Random facts don't stick; stories do (Nancy Duarte: Sparkline)
4. **One Idea Per Slide** - Cognitive load is real (Guy Kawasaki: 10 slides max)
5. **Audience as Hero** - It's their transformation, not your information (Duarte)
6. **Data Integrity** - Visual truth matters (Edward Tufte: Lie factor 0.95-1.05)

## Features

### Guided Creation with Checkpoints

**Phase 1: Discovery & Context Analysis**
- Analyzes topic, audience, duration, purpose
- Detects presentation type (board update, keynote, training, TED-style)
- Recommends story framework

**Phase 2: Content Development**
- Researches topic if needed
- Extracts key concepts (max 10 per Kawasaki)
- Drafts slide outline with one concept per slide
- Identifies slides needing visuals

**Phase 3: Visual Strategy**
- Proposes image types (infographic, photo, diagram, data viz)
- Suggests visual concepts and metaphors
- Estimates generation costs
- Gets approval before generating

**Phase 4: Generation & Validation**
- Generates approved images in parallel
- Builds slides using selected format (PPTX/Slides/Canva)
- Applies design rules automatically
- Runs validation scoring (0-100)
- Generates quality report

**Phase 5: Iteration & Refinement** (if needed)
- Applies requested changes
- Re-validates quality
- Saves to Obsidian with metadata
- Documents learnings

### Automatic Quality Validation

Every presentation is scored 0-100 against these criteria:

- **Simplicity** (10pts): Word count, visual clutter
- **Visual Dominance** (10pts): Image quality, text-to-visual ratio
- **Story Structure** (10pts): Narrative arc, emotional beats
- **One Idea/Slide** (10pts): Concept clarity
- **Typography** (8pts): Size (30pt+ minimum), consistency
- **Layout** (7pts): Hierarchy, whitespace, alignment
- **Color/Contrast** (7pts): Readability (4.5:1 minimum)
- **Media Quality** (8pts): Image resolution, relevance
- **Cognitive Load** (20pts): Mayer's 12 multimedia principles
- **Data Integrity** (10pts): Tufte principles (if applicable)

**Target Score**: 85+ for high-quality presentations

### Critical Violations (Auto-Fail)

- Font size < 30pt
- >10 core concepts
- Bullet points detected
- Paragraphs (>2 sentences)
- Poor contrast (<4.5:1)
- Default templates

### Multi-Format Support

**Phase 1 (Current)**: PPTX
- Uses existing pptx skill
- Direct PptxGenJS API for simple slides
- Saves to Obsidian Research folder

**Phase 2 (Coming)**: Google Slides
- Google Slides API v1
- Supports all 3 accounts (psd, kh, hrg)
- Returns shareable link

**Phase 3 (Future)**: Canva
- Canva REST API
- Auto-applies brand kits

## Slide Patterns

Six proven patterns that form the foundation of world-class presentations:

### 1. Title Slide
**Purpose**: Set tone, introduce topic
**Elements**: 3-6 words, strong visual or clean typography
**Best for**: Opening, section breaks

### 2. One Big Idea
**Purpose**: Maximum impact, single concept
**Elements**: 1-3 words max, 60-120pt font
**Best for**: Key insights, memorable moments (Seth Godin's 6-word rule)

### 3. Visual + Caption
**Purpose**: Visual storytelling with context
**Elements**: Large high-quality image (70-80%), short caption (1 line)
**Best for**: Concepts, examples, emotional moments

### 4. Data Visualization
**Purpose**: Show quantitative information clearly
**Elements**: Clean charts following Tufte principles
**Best for**: Evidence, trends, comparisons

### 5. Timeline / Process
**Purpose**: Show progression, sequence, chronology
**Elements**: 3-7 steps, visual connections, minimal text
**Best for**: Processes, roadmaps, historical progression

### 6. Transition / Section Break
**Purpose**: Signal major shifts
**Elements**: 1-5 words, distinct visual treatment
**Best for**: Moving between major sections

See `principles/slide-patterns.md` for comprehensive details on each pattern.

## Story Frameworks

Choose the right narrative structure for your presentation:

### Nancy Duarte's Sparkline
**Duration**: 20-30 minutes
**Slides**: 18-25
**Best for**: Keynotes, vision casting, inspirational talks
**Structure**: Alternate "what is" (reality) with "what could be" (aspiration)

### Steve Jobs' Rule of Three
**Duration**: 15-30 minutes
**Slides**: 12-18
**Best for**: Product launches, demos, persuasive presentations
**Structure**: Three main sections, three points per section

### TED Talk Structure
**Duration**: 15-20 minutes
**Slides**: 12-18
**Best for**: Idea-centric, inspirational talks
**Structure**: Hook → Personal → Core Idea → Call to Action → Close

### Classic Three-Act Structure
**Duration**: 20-45 minutes
**Slides**: 15-35
**Best for**: Case studies, transformation narratives
**Structure**: Setup (25%) → Confrontation (50%) → Resolution (25%)

See `principles/story-frameworks.md` for detailed breakdowns.

## Adaptive Pattern Selection

The skill automatically recommends pattern distribution based on presentation type:

**Board Update**: 40% Data Viz, 30% Visual+Caption, 20% Transitions, 10% Titles
**Keynote**: 40% Big Ideas, 30% Visual+Caption, 20% Titles, 10% Transitions
**Training**: 40% Process, 30% Data Viz, 20% Visual+Caption, 10% Titles
**Pitch**: 30% Data Viz, 30% Big Ideas, 25% Visual+Caption, 15% Titles/Transitions

## Image Generation Integration

Intelligent visual recommendations based on slide content:

- **Numeric data** → Infographic
- **Abstract concepts** → Conceptual image/metaphor
- **Concrete examples** → Realistic photography
- **Processes/flows** → Diagrams
- **Trends/comparisons** → Data visualization

**Cost Management**:
- Shows estimated cost before generating ($0.13-$0.24 per image at 2K)
- Allows opt-out of specific images
- Tracks spending in presentation metadata

**Naming Convention**:
```
{presentation-id}-slide-{number}-{type}.png
Example: cybersecurity-2025-slide-02-threat-timeline.png
```

## Brand Integration

Automatically applies branding:
- **PSD presentations**: Uses psd-brand-guidelines skill
- **Personal presentations**: Uses personal brand (if defined)
- **Client presentations**: Custom brand kit (future)

## File Structure

```
presentation-master/
├── SKILL.md                           # Main skill documentation
├── README.md                          # This file
├── package.json                       # Dependencies
├── principles/
│   ├── masters.md                     # Best practices from experts (1,200+ lines)
│   ├── validation-rules.md            # Quality scoring system
│   ├── slide-patterns.md              # Template library (3,500+ lines)
│   └── story-frameworks.md            # Narrative structures (5,000+ lines)
├── scripts/
│   ├── analyze-context.js             # ✅ Detect presentation type & recommend framework
│   ├── validate-presentation.js       # ✅ Score presentation 0-100
│   └── suggest-images.js              # ✅ Visual recommendations & cost estimation
└── adapters/
    ├── pptx-adapter.js                # ✅ PowerPoint translation layer
    ├── slides-adapter.js              # ✅ Google Slides translation layer
    └── canva-adapter.js               # (future) Canva integration
```

## Usage Examples

### Example 1: Board Update

```
User: "Create presentation on cybersecurity trends for school board, 15 minutes"

Geoffrey:
**Context Analysis**
- Type: Board/Executive Update
- Audience: School board (non-technical)
- Duration: 15 minutes
- Purpose: Inform + Recommend action

**Recommended Structure**
Current State → Trends → Implications → Recommendations (10 slides)

[After approval]

**Draft Outline**
1. Title: Cybersecurity Trends 2025
2. Current Threat Landscape [visual: threat timeline]
3. Trend 1: AI-Powered Attacks [visual: concept illustration]
...

**Visual Strategy**
- 7 images recommended
- Estimated cost: $0.94 (2K resolution)
- Mix: 3 infographics, 2 charts, 1 diagram, 1 illustration

[After approval and generation]

**Quality Score: 91/100**
✓ All fonts 36pt+
✓ Avg 4.2 words/slide
✓ High contrast (8.5:1)
⚠ Slide 8 has 7 words (rec: 6 max)

Created: /Obsidian/Research/cybersecurity-trends-2025-board.pptx
```

### Example 2: Keynote

```
User: "Create keynote on future of education for conference, 30 minutes"

Geoffrey:
**Context Analysis**
- Type: Keynote/TED-style
- Audience: Education professionals + parents
- Duration: 30 minutes
- Purpose: Inspire + Shift perspective

**Recommended Structures**
1. Sparkline: What is → What could be (12 slides) ⭐
2. Rule of Three: Past → Present → Future (9 slides)
3. Three-Act: Problem → Trials → New reality (10 slides)

[Continues with guided creation...]
```

## Dependencies

- `pptxgenjs`: PowerPoint generation library (current Phase 1)
- `image-gen` skill: Visual content generation
- `psd-brand-guidelines` skill: Brand colors/logos
- `research` skill: Content development
- `obsidian-manager` skill: Knowledge storage

## Installation

This skill is part of Geoffrey's skill library. No separate installation needed.

Ensure dependencies are installed:
```bash
cd /path/to/geoffrey/skills/presentation-master
bun install
```

## Triggers

Natural language activation:
- "create presentation"
- "make presentation"
- "build presentation"
- "design deck"
- "make slides"
- "create slides"
- "presentation for..."
- "slides for..."

## Version

**Current**: 1.2.0 (Phases 1-3 Complete)
- ✅ Phase 1: PPTX support via pptx skill
- ✅ Phase 2: Visual Intelligence (analyze-context, suggest-images, validate-presentation scripts)
- ✅ Phase 3: Google Slides support via google-workspace skill
**Future**: 1.3.0 (Canva integration)

## Learning & Iteration

After each presentation, metadata is saved to Obsidian:

```json
{
  "presentation_id": "cybersecurity-2025-board",
  "type": "board-update",
  "duration": "15min",
  "slides": 10,
  "quality_score": 91,
  "images_generated": 7,
  "generation_cost": 0.94,
  "user_edits": ["slide-8-wording"],
  "effectiveness": "approved-minor-changes",
  "created": "2025-11-24",
  "learnings": "Board prefers data charts over concept graphics"
}
```

This enables:
- Quality score trending
- Pattern library expansion
- User preference learning
- Cost optimization

## Philosophy

**Code Before Prompts** (Geoffrey Principle):
- Deterministic design rules codified in software
- AI orchestrates, doesn't improvise design
- Validation is automatic, not subjective

**Progressive Disclosure** (Geoffrey Principle):
- Tier 1: Core workflow (always loaded)
- Tier 2: Detailed principles (loaded when skill activates)
- Tier 3: Scripts and data (fetched just-in-time)

**Checkpoints Are Non-Negotiable**:
- Structure approval before content development
- Outline approval before visual strategy
- Visual approval before generation
- Quality review before finalization

## References

**Books**:
- *Presentation Zen* by Garr Reynolds
- *Resonate* by Nancy Duarte
- *slide:ology* by Nancy Duarte
- *The Visual Display of Quantitative Information* by Edward Tufte
- *Multimedia Learning* by Richard Mayer

**Articles**:
- Guy Kawasaki: The 10/20/30 Rule of PowerPoint
- Seth Godin: Really Bad PowerPoint
- TED: Create + Prepare Slides Guide

**Principles Documentation**:
- `principles/masters.md` - Comprehensive best practices
- `principles/validation-rules.md` - Quality scoring details
- `principles/slide-patterns.md` - Pattern specifications
- `principles/story-frameworks.md` - Narrative structures

## Future Enhancements

**Phase 4: Canva Integration**
- Canva REST API adapter
- Auto-apply brand kits
- Template library integration

**Phase 5: Advanced Features**
- Auto-generate speaker notes
- Rehearsal timing suggestions
- A/B test different structures
- Effectiveness tracking
- Personal pattern library from successes

## Contributing

Improvements welcome! When adding new features:
1. Follow existing architectural patterns
2. Document in appropriate principles file
3. Add examples to SKILL.md
4. Update version in package.json
5. Add learning to metadata tracking

## License

MIT License - See LICENSE file for details

---

**Remember**: The best presentations are simple, visual, story-driven, and focused on the audience's transformation—not the speaker's information.

Built with ❤️ by Geoffrey
