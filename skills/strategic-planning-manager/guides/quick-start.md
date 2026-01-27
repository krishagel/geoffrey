# Strategic Planning Manager - Quick Start Guide

## What This Skill Does

Helps facilitate K-12 district strategic planning using a 7-phase process. The AI handles data analysis and document generation; humans drive vision and decision-making.

**For personal life/work planning:** Use `/personal-strategic-planning` instead.

---

## Choose Your Entry Point

### "I'm starting from scratch"
→ **Full Process Guide** (Mode 1)

Say: *"Help me create a strategic plan for our district"*

Geoffrey will walk you through all 7 phases:
1. Discovery (gather/analyze data)
2. SWOT Analysis
3. Practical Vision
4. Underlying Contradictions
5. Strategic Directions
6. Implementation Planning
7. Document Generation

**Time commitment:** Multiple sessions over 2-4 weeks

---

### "I have survey data to analyze"
→ **Data Analysis Mode** (Mode 3)

Say: *"Analyze our strategic planning survey data"*

Provide your CSV/Excel/JSON file and Geoffrey will:
- Extract themes from responses
- Run sentiment analysis
- Compare stakeholder groups
- Suggest SWOT inputs

**Time commitment:** 15-30 minutes per dataset

---

### "I need to facilitate a retreat"
→ **Facilitator Support**

Say: *"Help me prepare for our strategic planning retreat"*

Geoffrey will provide:
- Detailed agendas (1-day or 2-day options)
- Facilitator prompts for each session
- Materials checklists
- Timing guidance

**Available agendas:**
- `guides/retreat-agenda-2day.md` - Full 2-day retreat
- `guides/retreat-agenda-condensed.md` - 1-day version

---

### "I'm working on one specific phase"
→ **Phase-Specific Mode** (Mode 2)

Say what you need:
- *"Help me create a SWOT analysis"* → Phase 2
- *"Let's develop our practical vision"* → Phase 3
- *"We need to identify underlying contradictions"* → Phase 4
- *"Help define our strategic directions"* → Phase 5
- *"Create our implementation timeline"* → Phase 6

Geoffrey will focus on just that phase.

---

### "We have an existing plan to update"
→ **Plan Update Mode** (Mode 4)

Say: *"Update our existing strategic plan for year 2"*

Geoffrey will:
- Load your existing plan from Obsidian
- Ask about progress on Year 1 goals
- Identify what's on track / at risk
- Recommend adjustments
- Generate updated documents

---

## Common Workflows

### Workflow A: Pre-Retreat Data Analysis

**Scenario:** You have survey results and want themes before the retreat.

1. Say: *"I have survey results to analyze for strategic planning"*
2. Upload/provide the CSV file
3. Review the theme analysis
4. (Optional) Say: *"Generate a draft SWOT from this data"*
5. Use outputs as pre-reading for retreat participants

**Scripts used:**
```bash
uv run skills/strategic-planning-manager/scripts/analyze_surveys.py --input data.csv --output-dir ./discovery
```

---

### Workflow B: Facilitated Retreat Support

**Scenario:** You're facilitating a 2-day retreat and want AI support.

1. Say: *"Help me prepare for our 2-day strategic planning retreat"*
2. Review the agenda in `guides/retreat-agenda-2day.md`
3. For each session, ask: *"What prompts should I use for the SWOT session?"*
4. During the retreat, dictate outputs and Geoffrey will capture them
5. After the retreat: *"Compile our retreat outputs into a plan document"*

---

### Workflow C: Focus Group Transcript Processing

**Scenario:** You conducted focus groups and have transcripts to analyze.

1. Say: *"Process our focus group transcripts"*
2. Provide the transcript files (text/Word)
3. Review extracted themes and quotes
4. Say: *"Add these findings to our discovery report"*

**Script used:**
```bash
uv run skills/strategic-planning-manager/scripts/process_transcripts.py --input-dir ./transcripts --output themes.json
```

---

### Workflow D: Generate Final Plan Document

**Scenario:** You've completed all phases and need the final document.

1. Say: *"Generate our strategic plan document"*
2. Geoffrey compiles all outputs into a cohesive plan
3. Request specific versions:
   - *"Create a board executive summary"*
   - *"Create a staff-facing version"*
   - *"Create a community summary"*

---

## The 7 Phases - Quick Reference

| Phase | Who Does the Work | What You Get |
|-------|-------------------|--------------|
| 1. Discovery | **AI analyzes** your data | Theme report, initial SWOT draft |
| 2. SWOT | **Humans validate**, AI refines | SWOT matrix, investment priorities |
| 3. Vision | **Humans create**, AI captures | Vision matrix (8-10 categories) |
| 4. Contradictions | **Humans identify**, AI patterns | Tension analysis |
| 5. Directions | **Humans decide**, AI maps | 4-6 strategic directions |
| 6. Implementation | **Humans commit**, AI structures | Timeline, success indicators |
| 7. Documents | **AI generates**, humans approve | Full plan, summaries, presentations |

---

## Tips for Best Results

1. **Provide real data** - The more survey/transcript data you provide, the better the analysis
2. **Be specific about your district** - Name, context, existing priorities
3. **Save as you go** - Geoffrey stores work in Obsidian (`Geoffrey/Strategic-Plans/`)
4. **Use facilitator guides** - They have the exact prompts and timing
5. **Phase-specific is fine** - You don't have to do all 7 phases in one session

---

## Quick Commands

| What you want | What to say |
|---------------|-------------|
| Start full process | "Help me create a district strategic plan" |
| Analyze surveys | "Analyze our survey data for strategic planning" |
| Process transcripts | "Process our focus group transcripts" |
| Generate SWOT | "Create a SWOT analysis from our discovery data" |
| Prepare for retreat | "Help me prepare for our strategic planning retreat" |
| Get facilitator prompts | "What prompts should I use for the vision session?" |
| Generate final plan | "Compile everything into a strategic plan document" |
| Update existing plan | "Update our strategic plan for year 2" |

---

## File Locations

**Templates:** `skills/strategic-planning-manager/templates/`
**Facilitator Guides:** `skills/strategic-planning-manager/guides/`
**Config (themes, metrics):** `skills/strategic-planning-manager/config/`
**Scripts:** `skills/strategic-planning-manager/scripts/`

**Your plans saved to:** `Obsidian/Geoffrey/Strategic-Plans/{District-Name}/`

---

*Quick Start Guide - Strategic Planning Manager v1.0.0*
