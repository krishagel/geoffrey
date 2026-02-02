---
name: strategic-planning-manager
description: Organizational strategic planning for K-12 school districts using a research-backed 4-stage process
triggers:
  - "strategic planning"
  - "district strategic plan"
  - "k-12 strategic planning"
  - "school district planning"
  - "strategic plan"
  - "SWOT analysis"
  - "strategic directions"
  - "strategic retreat"
  - "organizational planning"
allowed-tools:
  - Read
  - Write
  - Bash
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
  - WebSearch
  - mcp__obsidian-vault__create_vault_file
  - mcp__obsidian-vault__get_vault_file
  - mcp__obsidian-vault__search_vault_simple
version: 2.0.0
---

# Strategic Planning Manager Skill

Organizational strategic planning system for K-12 school districts using a research-backed 4-stage process. Synthesizes best practices from Education Elements, Hanover Research, AASA, ThoughtExchange, and facilitation methodology.

> **Start Here:** New to this skill? Read `guides/leader-overview.md` for a full introduction to the 4-stage process, superintendent roles, team formation, and readiness assessment.

> **Note:** For personal life/work strategic planning, use the `personal-strategic-planning` skill instead.

## When to Activate

This skill activates when the user requests:

**Full Strategic Planning Process:**
- "Help me create a strategic plan for our district"
- "We need to do strategic planning"
- "Let's start the district strategic planning process"
- "Facilitate our strategic planning retreat"

**Stage-Specific Work:**
- "Analyze our survey data for strategic planning"
- "Help me process focus group transcripts"
- "Generate a SWOT analysis"
- "Help define our strategic directions"
- "Build our implementation timeline"
- "Set up progress monitoring"

**Plan Update Mode:**
- "Update our existing strategic plan"
- "It's time to refresh our strategic plan"
- "Annual strategic plan review"

## Skill Modes

### Mode 1: Full Process Guide
Walk through all 4 stages sequentially, prompting for data inputs and facilitating each step.
- Best for: New strategic plans, comprehensive planning retreats

### Mode 2: Stage-Specific Entry
Jump directly into any specific stage with appropriate inputs.
- Best for: Working on one component, picking up where you left off

### Mode 3: Data Analysis Only
Process surveys, transcripts, and documents without running the full planning process.
- Best for: Pre-work, discovery, feeding data into existing processes

### Mode 4: Plan Update
Start from an existing plan, analyze progress, update for a new cycle.
- Best for: Annual reviews, mid-cycle adjustments, refresh cycles

---

## The 4-Stage Strategic Planning Process

### Stage 1: Engage & Assess
**Key Question:** Where are we now?
**AI Role:** Data analysis, synthesis, draft preparation
**Human Role:** Data collection, stakeholder engagement, validation

**What Happens:**
- Gather and analyze data (surveys, focus groups, document review)
- Engage stakeholders across the community
- Conduct SWOT analysis with prioritization
- Identify investment opportunities and critical barriers

**Available Scripts:**
```bash
# Analyze survey data
uv run skills/strategic-planning-manager/scripts/analyze_surveys.py \
  --input survey_results.csv \
  --output-dir ./discovery

# Process focus group transcripts
uv run skills/strategic-planning-manager/scripts/process_transcripts.py \
  --input-dir ./transcripts \
  --output ./discovery/transcript-themes.json

# Generate SWOT from discovery data
uv run skills/strategic-planning-manager/scripts/generate_swot.py \
  --discovery-dir ./discovery \
  --output ./outputs/swot-analysis.md
```

**Outputs:**
- Discovery Report (`templates/discovery-report.md`)
- SWOT Analysis (`templates/swot-template.md`)
- Stakeholder input summary
- Key findings synthesis

**Guide:** `guides/stage1-engage-assess-guide.md`

---

### Stage 2: Set Direction
**Key Question:** Where do we want to go?
**AI Role:** Provide prompts, capture input, map alignment
**Human Role:** Visioning, decision-making, prioritization

**What Happens:**
- Define or reaffirm Mission, Vision, and Values
- Identify 3-6 district priority areas
- Define long-term outcome goals
- Develop 4-6 strategic directions

**Optional Deeper Work:**
- Deep participatory visioning exercise → `guides/appendix-a-vision-development.md`
- Organizational tension analysis → `guides/appendix-b-tension-analysis.md`
- Developing a Profile of a Graduate → `guides/appendix-c-graduate-profile.md`

**Outputs:**
- Mission/Vision/Values statements
- Priority areas with outcome goals
- Strategic Directions Framework (`templates/strategic-directions.md`)
- Direction-to-priority alignment matrix

**Guide:** `guides/stage2-set-direction-guide.md`

---

### Stage 3: Build the Plan & Align Resources
**Key Question:** How will we get there?
**AI Role:** Structure creation, timeline drafting, metric suggestions
**Human Role:** Reality testing, commitment making, ownership assignment

**What Happens:**
- Develop three-column plans (Current Reality → 1-Year → 3-Year)
- Define measurable goals and success indicators
- Choose strategies/initiatives per direction
- Assign ownership and align resources
- Build Year 1 quarterly timeline
- Cross-direction integration check

**Outputs:**
- Implementation Tables (`templates/focused-implementation.md`)
- Success indicator matrix
- First-Year Timeline (`templates/first-year-timeline.md`)
- Resource alignment plan
- Ownership chart

**Guide:** `guides/stage3-build-plan-guide.md`

---

### Stage 4: Implement, Monitor & Improve
**Key Question:** Are we making progress?
**AI Role:** Dashboard creation, report drafting, data analysis
**Human Role:** Implementation leadership, decision-making, accountability

**What Happens:**
- Develop annual action plans
- Track leading and lagging indicators
- Report to board and community on regular cadence
- Make mid-course adjustments when data warrants
- Conduct annual reviews and mid-plan refreshes

**Available Scripts:**
```bash
# Generate strategic plan document from all stage outputs
uv run skills/strategic-planning-manager/scripts/synthesize_plan.py \
  --work-dir ./planning \
  --output ./outputs/strategic-plan.md \
  --format full  # or 'executive', 'board', 'staff', 'community'
```

**Outputs:**
- Full Strategic Plan Document (`templates/full-strategic-plan.md`)
- Executive Summary (`templates/executive-summary.md`)
- Annual action plans
- Progress dashboards
- Board reports

**Guide:** `guides/stage4-implement-improve-guide.md`

---

## Available Scripts

### Survey Analysis
```bash
uv run skills/strategic-planning-manager/scripts/analyze_surveys.py \
  --input data.csv \
  --format csv \
  --output-dir ./discovery
```

**Supported formats:** CSV, JSON, Excel (.xlsx, .xls)

**Analysis includes:**
- Response distribution statistics
- Sentiment analysis per question
- Theme extraction from open-ended responses
- Stakeholder group comparisons (if demographics provided)
- Word frequency and phrase analysis

### Transcript Processing
```bash
uv run skills/strategic-planning-manager/scripts/process_transcripts.py \
  --input-dir ./transcripts \
  --output ./discovery/transcript-themes.json
```

**Analysis includes:**
- Theme extraction using NLP
- Sentiment patterns
- Speaker/stakeholder attribution (if labeled)
- Quote extraction for evidence
- Cross-transcript pattern identification

### SWOT Generation
```bash
uv run skills/strategic-planning-manager/scripts/generate_swot.py \
  --discovery-dir ./discovery \
  --output ./outputs/swot-analysis.md
```

**Generates:**
- Data-driven SWOT matrix
- Supporting evidence citations
- Investment priority recommendations
- Barrier analysis

### Plan Synthesis
```bash
uv run skills/strategic-planning-manager/scripts/synthesize_plan.py \
  --work-dir ./planning \
  --output ./outputs/strategic-plan.md \
  --format full  # or 'executive', 'board', 'staff', 'community'
```

**Generates:**
- Complete strategic plan document
- Multiple stakeholder versions
- Executive summary
- Board presentation outline

---

## Facilitator Guides

| Guide | Purpose | Duration |
|-------|---------|----------|
| `leader-overview.md` | Full process overview for superintendents | Reference |
| `stage1-engage-assess-guide.md` | Data collection + SWOT workshop | 2-6 weeks + 2.5 hrs |
| `stage2-set-direction-guide.md` | Vision, priorities, strategic directions | 3-4 hours |
| `stage3-build-plan-guide.md` | Implementation planning workshop | 3-4 hours |
| `stage4-implement-improve-guide.md` | Monitoring and continuous improvement | Ongoing |
| `appendix-a-vision-development.md` | Deep participatory visioning exercise | 3-4 hours |
| `appendix-b-tension-analysis.md` | Organizational tension analysis | 2-3 hours |
| `appendix-c-graduate-profile.md` | Profile of a Graduate development process | Multi-session |
| `six-month-timeline.md` | Month-by-month planning timeline | Reference |
| `retreat-agenda-2day.md` | Full 2-day retreat (all 4 stages) | 2 days |
| `retreat-agenda-condensed.md` | Condensed 1-day (Stages 1-3) | 1 day |

Each guide includes:
- Detailed agenda with timing
- Facilitator prompts and questions
- Small group and large group activities
- Materials needed
- Expected outputs
- Common challenges and solutions

---

## Data Storage (Obsidian)

Strategic plans are stored in the Obsidian vault:

```
Personal_Notes/Geoffrey/Strategic-Plans/
├── {District-Name}/
│   ├── {Year}-Strategic-Plan.md
│   ├── Discovery-Report.md
│   ├── SWOT-Analysis.md
│   ├── Strategic-Directions.md
│   ├── Implementation-Plan.md
│   ├── Progress-Reports/
│   │   └── [Quarterly/annual reports]
│   └── Facilitator-Guides/
│       └── [Generated guides for this district]
```

**Frontmatter:**
```yaml
---
type: strategic-plan
district: {District Name}
year: {YYYY}
stage: {1-4 or complete}
status: draft | in-progress | final
created: {date}
updated: {date}
---
```

---

## Common K-12 Strategic Themes

Pre-loaded from `config/k12-themes.yaml`:

| Theme | Prevalence | Key Metrics |
|-------|------------|-------------|
| Student Achievement | 90%+ | Test scores, graduation rates, college readiness |
| Equity & Access | 90% | Gap reduction, program access, representation |
| Staff Quality & Retention | 80% | Hiring, development, turnover rates |
| Parent/Community Engagement | 80% | Participation, satisfaction, partnerships |
| Facilities & Technology | 75% | Infrastructure, device ratios, connectivity |
| Fiscal Sustainability | 70% | Budget balance, reserves, cost efficiency |
| Social-Emotional Learning | Growing | SEL metrics, climate surveys, wellness |
| Safety & Security | Variable | Incident rates, preparedness, climate |

---

## Research Foundations

This skill synthesizes best practices from:

**ThoughtExchange 3 Models:**
- Plan on a Page
- VMOSA (Vision → Mission → Objectives → Strategies → Action Plan)
- Five-Step Model

**Education Elements (7 Steps):**
- Pre-Planning Assessment
- Community Engagement Strategy
- Strategic Planning Team Formation
- Build Common Understanding
- Design Solutions (prioritization matrix)
- Communication Planning
- Monitoring and Adaptation

**Hanover Research (5 Phases):**
- Discovery (surveys, benchmarking)
- Analysis (SWOT synthesis)
- Visioning (workshops)
- Goal Setting (SMART goals)
- Implementation Roadmap (KPIs)

**AASA 10-Step Framework:**
- Comprehensive district leadership approach
- Emphasis on board/superintendent buy-in
- Quarterly monitoring, annual evaluation

**Facilitation Methodology:**
- ORID Method (Objective → Reflective → Interpretive → Decisional)
- Focused Conversation
- Consensus Workshop
- Strategic Planning Matrix

---

## Example Workflow

### Starting a New Strategic Plan

```
User: "Help me create a strategic plan for our district"

Geoffrey:
1. Ask which mode: Full Process, Stage-Specific, or Data Analysis
2. If Full Process:
   - Ask about available data (surveys, transcripts, existing docs)
   - Ask about timeline (retreat dates, board presentation date)
   - Ask about stakeholder groups to involve
3. Begin Stage 1: Engage & Assess
   - Ingest provided data files
   - Generate Discovery Report and SWOT
4. Continue through stages with appropriate AI/human balance
5. Generate final plan documents
6. Save to Obsidian vault
```

### Analyzing Survey Data Only

```
User: "I have survey results I need to analyze for strategic planning"

Geoffrey:
1. Ask for data file(s) and format
2. Run analyze_surveys.py
3. Present findings:
   - Key themes
   - Stakeholder differences
   - Sentiment analysis
   - Suggested SWOT inputs
4. Ask if user wants to continue to SWOT generation
```

### Updating an Existing Plan

```
User: "We need to update our strategic plan for year 2"

Geoffrey:
1. Load existing plan from Obsidian
2. Ask about progress on Year 1 accomplishments
3. Collect new data/feedback
4. Identify what's on track, at risk, off track
5. Recommend adjustments to timeline/directions
6. Generate updated plan document
```

---

## Error Handling

**1. No data provided for discovery:**
- Offer to conduct discovery interviews directly
- Suggest data collection templates
- Proceed with qualitative input only

**2. Insufficient stakeholder representation:**
- Flag which groups are missing
- Recommend targeted data collection
- Note limitation in final report

**3. Conflicting stakeholder priorities:**
- Surface tensions explicitly
- Use as input for strategic direction decisions
- Document minority viewpoints

**4. Unrealistic implementation timeline:**
- Flag capacity concerns
- Suggest prioritization/phasing
- Recommend reducing scope or extending timeline

**5. Plan update with no progress data:**
- Conduct progress interview
- Use qualitative assessment
- Note "self-reported" vs "measured" progress

---

## Version History

**v2.0.1** (2026-02-02)
- Added Appendix C: Developing a Profile of a Graduate
- Community workshop and student voice facilitation scripts
- Common competency categories reference table
- Guidance on connecting profile to strategic plan
- Updated facilitation prompts with graduate_profile section

**v2.0.0** (2026-02-02)
- Restructured from 7-phase to 4-stage process
- 4 stages: Engage & Assess → Set Direction → Plan & Align → Implement & Improve
- New leader overview with readiness self-assessment
- New Stage 4 guide (monitoring, board reporting, review cycles)
- New 6-month planning timeline
- New fillable strategic planning template
- Deep visioning moved to Appendix A
- Tension analysis moved to Appendix B (rebranded from "contradictions")
- Retreat agendas restructured around 4 stages
- Removed methodology-specific branding throughout

**v1.0.0** (2026-01-26)
- Initial release
- 7-phase methodology
- 4 skill modes (Full, Phase-Specific, Data Analysis, Update)
- Python scripts for data analysis
- Facilitator guides for human sessions
- Obsidian integration for plan storage
- K-12 themes and metrics library
- Research-backed framework synthesis
