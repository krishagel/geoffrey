# Research Skill Enhancement - Requirements

## Core Principles

1. **Discovery-driven, not list-driven** - Find best sources wherever they are
2. **Context-aware** - Grounded in user's domain preferences
3. **Finds unknowns** - Value is in discovering what user doesn't know
4. **No time limits** - Can run 30 min to 3 hours
5. **Exhaustive** - Don't stop until topic is exhausted

## Domain Contexts

### What Context Provides
- **Relevance filtering** - what matters to this user
- **Constraint awareness** - their specific resources/limitations
- **Optimization targets** - what to maximize for them

### Domain: Travel
- Loyalty: Alaska MVP Gold 75K, Marriott Titanium Elite
- Points: Current balances (fetch via browser-control)
- Credit cards: Alaska card, Marriott Amex, Chase Sapphire Preferred
- Memberships: Epic Pass
- Preferences: "Luxury at rock-bottom prices", never book only research

### Domain: Shopping
- Quality standards
- Budget ranges
- Brand preferences

### Domain: Work/Education
- PSD context (CIO role)
- UDL expertise
- Edtech landscape
- District priorities

### Domain: AI/Coding
- Tech stack preferences
- Languages/frameworks
- Architecture patterns

### Domain: Consulting
- Service offerings
- Client contexts

## Research Engine Architecture

### Phase 1: Query Understanding
- Detect domain from query
- Load relevant context
- Decompose into sub-questions (5-10 angles)
- Identify what types of sources needed (academic, forum, video, etc.)

### Phase 2: Parallel Multi-Source Discovery
- Launch multiple search strategies simultaneously:
  - Multiple search engines (Google, Bing, DuckDuckGo)
  - Multiple query formulations
  - Different source types (articles, forums, videos, podcasts)
- Use multiple LLMs for different perspectives:
  - Perplexity: Current web info with citations
  - Gemini: Multi-perspective synthesis
  - OpenAI: Structured analysis
  - Claude: Deep reasoning

### Phase 3: Source Evaluation & Expansion
- Evaluate each source for:
  - Credibility (author expertise, publication reputation)
  - Recency (when published/updated)
  - Depth (surface vs comprehensive)
  - Citations (does it cite others? is it cited?)
- Follow promising leads:
  - Sources referenced by good sources
  - Authors who appear multiple times
  - Cross-referenced claims

### Phase 4: Deep Scraping
- Don't stop at first page of results
- Go 5-10 pages deep on good queries
- Use browser-control for:
  - JS-rendered content (Reddit, forums)
  - Authenticated pages (user accounts)
  - Sites that block scrapers
- Follow internal links on valuable sources

### Phase 5: Multimedia Discovery
- YouTube videos
- TikTok content
- Podcasts (Spotify, Apple)
- Not just text articles

### Phase 6: Synthesis
- Organize by theme/question
- Every claim cited
- Note consensus vs disagreement
- Include multimedia resources
- Provide actionable recommendations
- Flag what's still uncertain

## Output Format

```markdown
## Research: [Topic]

### Context Applied
- [Domain context that was loaded]
- [Dynamic data fetched - e.g., current point balances]

### Executive Summary
[2-3 paragraph overview of key findings]

### Detailed Findings

#### [Sub-topic 1]
[Deep analysis with inline citations]

#### [Sub-topic 2]
[Deep analysis with inline citations]

### Multimedia Resources
- [Video: Title](url) - description
- [Podcast: Title](url) - description
- [TikTok: @user](url) - description

### Recommendations
1. [Actionable recommendation based on user's context]
2. [Another recommendation]

### What I Discovered You Might Not Know
- [Surprising finding 1]
- [Surprising finding 2]

### Confidence Assessment
- High confidence: [topics]
- Needs verification: [topics]
- Conflicting information: [topics]

### All Sources
[Complete list of every URL referenced]
```

## Technical Implementation

### Files to Create/Modify
- [ ] Update preferences.json with domain contexts
- [ ] Create domain context loader
- [ ] Create multi-LLM research orchestrator
- [ ] Create source evaluator
- [ ] Create deep scraper (uses browser-control)
- [ ] Create multimedia searcher
- [ ] Create synthesis engine
- [ ] Update SKILL.md with new architecture

### API Keys Needed
- PERPLEXITY_API_KEY
- GEMINI_API_KEY
- OPENAI_API_KEY
- (Claude runs natively)

### Browser-Control Integration
- Fetch current balances (Marriott, Alaska, Chase)
- Scrape full forum threads
- Access authenticated content
- Handle JS-rendered sites

## Success Criteria

1. Can run a travel research query and get:
   - Current point balances fetched
   - Transfer bonus opportunities identified
   - 5-6 hotel options with points AND cash prices
   - Flight options with miles needed
   - Deep user reviews from forums
   - Video content discovered
   - Optimization recommendations

2. Report takes 30-60 minutes to generate (not 5 minutes)

3. Sources include things user didn't know existed

4. Every claim is cited

5. Recommendations are specific to user's context
